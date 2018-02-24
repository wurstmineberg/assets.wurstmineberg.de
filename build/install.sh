#!/bin/sh

set -ev

export WURSTMINEBERG_CONFIG_DIR=build

pip install Pillow
git clone https://github.com/wurstmineberg/systemd-minecraft.git
cd systemd-minecraft
pip install .
cd ..

python -m minecraft update
