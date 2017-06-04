#!/bin/sh

set -e

pip install Pillow
git clone https://github.com/wurstmineberg/systemd-minecraft.git
cd systemd-minecraft
python setup.py install
cd ..

python -m minecraft update
