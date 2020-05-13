#! /usr/bin/env python3

import json
#import minecraft
import pathlib
import shutil
import zipfile

def build_items():
    with pathlib.Path('json/items-base.json').open() as items_base_f:
        items = json.load(items_base_f)
    return items

def minecraft_version():
    return '1.15.2' #TODO automate?

if __name__ == '__main__':
    # unzip client
    #version = minecraft.World().version()
    version = minecraft_version()
    #client_jar_path = minecraft.CONFIG['paths']['clientVersions'] / version / f'{version}.jar'
    client_jar_path = pathlib.Path(f'/opt/wurstmineberg/.minecraft/versions/{version}/{version}.jar')
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
