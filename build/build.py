#! /usr/bin/env python3

import minecraft
import pathlib
import shutil
import zipfile

if __name__ == '__main__':
    # unzip client
    version = minecraft.World().version()
    client_jar_path = minecraft.CONFIG['paths']['clientVersions'] / version / '{}.jar'.format(version)
    with zipfile.ZipFile(str(client_jar_path)) as client_jar:
        client_jar.extractall('build/clientjar')
    client = pathlib.Path('build/clientjar')
    # copy advancements
    if pathlib.Path('json/advancements').exists():
        shutil.rmtree('json/advancements')
    shutil.copytree(str(client / 'assets' / 'minecraft' / 'advancements'), 'json/advancements')
    # copy lang
    if pahlib.Path('json/lang.json').exists():
        pahlib.Path('json/lang.json').unlink()
    lang = {}
    with (client / 'assets' / 'minecraft' / 'lang' / 'en_us.lang').open() as lang_f:
        for line in lang_f.read().splitlines():
            if '=' in line:
                translation_key, translated_text = line.split('=', 1)
                lang[translation_key] = translated_text
    with pathlib.Path('json/lang.json').open('w') as lang_json_f:
        json.dump(lang, lang_json_f, indent=4, sort_keys=True)
    # remove client files
    shutil.rmtree('build/clientjar')
