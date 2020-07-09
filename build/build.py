#! /usr/bin/env python3

import json
import pathlib
import platform
import shutil
import zipfile

import more_itertools # PyPI: more-itertools
import requests # PyPI: requests

import minecraft_data # https://github.com/fenhl/python-minecraft-data

def _download(url, local_filename=None): #FROM http://stackoverflow.com/a/16696317/667338
    if local_filename is None:
        local_filename = url.split('#')[0].split('?')[0].split('/')[-1]
        if local_filename == '':
            raise ValueError('no local filename specified')
    r = requests.get(url, stream=True)
    with open(local_filename, 'wb') as f:
        for chunk in r.iter_content(chunk_size=1024):
            if chunk: # filter out keep-alive new chunks
                f.write(chunk)
        f.flush()

def build_items():
    data = minecraft_data(minecraft_version())
    all_items = {}
    for item in data.items_list:
        all_items[item['name']] = {
            'name': item['displayName'],
            #TODO solid
            #TODO image
            #TODO damagedImages
            #TODO blockID
            'itemID': item['id'],
            #TODO damageValues
            #TODO effects
            #TODO tagPath
            #TODO tagVariants
            #TODO obtaining
            #TODO dropsSelf
            #TODO whenPlaced
            #TODO creativeMenu
            #TODO pickBlock
            #TODO durability
            'stackable': item['stackSize']
            #TODO alwaysGlow
        }
    return {'minecraft': all_items}

def client_versions_path():
    if platform.node() == 'gharch':
        import minecraft # https://github.com/wurstmineberg/systemd-minecraft

        return minecraft.CONFIG['paths']['clientVersions']
    else:
        return pathlib.Path('/opt/wurstmineberg/.minecraft/versions')

def download_client(version, client_jar_path):
    client_jar_path.parent.mkdir(exist_ok=True, parents=True)
    # get version info
    versions_json = requests.get('https://launchermeta.mojang.com/mc/game/version_manifest.json').json()
    version_dict = more_itertools.one(filter(lambda version_dict: version_dict.get('id') == version, versions_json['versions']))
    version_json = requests.get(version_dict['url']).json()
    # get client jar
    _download(version_json['downloads']['client']['url'], local_filename=client_jar_path)

def minecraft_version():
    if platform.node() == 'gharch':
        import minecraft # https://github.com/wurstmineberg/systemd-minecraft

        return minecraft.World().version()
    else:
        return '1.16.1' #TODO automate?

if __name__ == '__main__':
    # unzip client
    version = minecraft_version()
    client_jar_path = client_versions_path() / version / f'{version}.jar'
    if not client_jar_path.exists():
        download_client(version, client_jar_path)
    with zipfile.ZipFile(str(client_jar_path)) as client_jar:
        client_jar.extractall('build/clientjar')
    client = pathlib.Path('build/clientjar')
    # copy advancements
    if pathlib.Path('json/advancements').exists():
        shutil.rmtree('json/advancements')
    shutil.copytree(str(client / 'data' / 'minecraft' / 'advancements'), 'json/advancements')
    # build items
    if pathlib.Path('json/items.json').exists():
        pathlib.Path('json/items.json').unlink()
    with pathlib.Path('json/items.json').open('w') as items_json_f:
        json.dump(build_items(), items_json_f, indent=4, sort_keys=True)
        print(file=items_json_f) # add trailing newline
    # copy lang
    if pathlib.Path('json/lang.json').exists():
        pathlib.Path('json/lang.json').unlink()
    lang = {}
    shutil.copy2(client / 'assets' / 'minecraft' / 'lang' / 'en_us.json', 'json/lang.json')
    # remove client files
    shutil.rmtree('build/clientjar')
