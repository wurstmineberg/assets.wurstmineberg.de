#!/bin/sh

set -e

chown -R wurstmineberg ~travis/virtualenv
. ~travis/virtualenv/python3.4/bin/activate

pip install Pillow
git clone https://github.com/wurstmineberg/systemd-minecraft.git
cd systemd-minecraft
python setup.py install
cd ..

python -m minecraft update
