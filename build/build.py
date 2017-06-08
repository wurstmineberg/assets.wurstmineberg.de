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
    # copy advancements
    if pathlib.Path('json/advancements').exists():
        shutil.rmtree('json/advancements')
    shutil.copytree('build/clientjar/assets/minecraft/advancements', 'json/advancements')
    # remove client files
    shutil.rmtree('build/clientjar')
