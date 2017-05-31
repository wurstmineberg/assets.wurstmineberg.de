#! /usr/bin/env python3

import minecraft
import zipfile

if __name__ == '__main__':
    version = minecraft.World().version()
    client_jar_path = minecraft.CONFIG['paths']['clientVersions'] / version / '{}.jar'.format(version)
    with zipfile.ZipFile(str(client_jar_path)) as client_jar:
        client_jar.extract('assets/minecraft/advancements', 'json/advancements')
