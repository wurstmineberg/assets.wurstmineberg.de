#!/bin/sh

set -e

pip install Pillow
git clone https://github.com/wurstmineberg/systemd-minecraft.git
cd systemd-minecraft
python setup.py install
cd ..

sudo mkdir -p /opt/wurstmineberg/home
sudo useradd --home-dir=/opt/wurstmineberg/home wurstmineberg
sudo chown -R wurstmineberg:wurstmineberg /opt/wurstmineberg
sudo -u wurstmineberg python -m minecraft update
