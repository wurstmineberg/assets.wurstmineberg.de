#! /usr/bin/env python3

import PIL.Image
import json
import pathlib
import sys

tests = set()

def test(f):
    tests.add(f)
    return f

@test
def test_grid_image_sizes():
    for image_path in pathlib.Path('img/grid').iterdir():
        if image_path.suffix == '.png':
            img = PIL.Image.open(str(image_path))
            assert img.size == (32, 32)

@test
def validate_cloud_json():
    with open('json/items.json') as items_f:
        items = json.load(items_f)
    with open('json/cloud.json') as cloud_f:
        cloud = json.load(cloud_f)
    for y, floor in enumerate(cloud):
        for x, corridor in floor.items():
            x = int(x)
            for z, chest in enumerate(corridor):
                plugin, item_id = chest['id'].split(':', 1)
                try:
                    if 'damage' in chest:
                        assert 'effect' not in chest
                        assert str(chest['damage']) in items[plugin][item_id]['damageValues']
                    else:
                        assert 'damageValues' not in items[plugin][item_id]
                    if 'effect' in chest:
                        effect_plugin, effect_id = chest['effect'].split(':', 1)
                        assert effect_id in items[plugin][item_id]['effects'][effect_plugin]
                    else:
                        assert 'effects' not in items[plugin][item_id]
                except:
                    print('Error location: floor {} corridor {} chest {}: {}'.format(y, x, z, chest['id']), file=sys.stderr)
                    raise

@test
def validate_json():
    for file in pathlib.Path('json').iterdir():
        if file.suffix == '.json':
            try:
                with file.open() as f:
                    json.load(f)
            except:
                print('Error location: {}'.format(file))
                raise

def run_tests():
    for test in tests:
        test()

if __name__ == '__main__':
    run_tests()
