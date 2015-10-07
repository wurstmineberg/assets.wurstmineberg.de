#! /usr/bin/env python3

import PIL.Image
import json
import pathlib
import sys

tests = []

def validate_item_stub(item_stub, must_be_block=False, must_be_item=False, *, items=None, additional_fields=set()):
    fields = {
        'id',
        'damage',
        'effect',
        'tagValue',
        'consumed',
        'amount'
    } | additional_fields
    if item_stub is None:
        return
    if items is None:
        with open('json/items.json') as items_f:
            items = json.load(items_f)
    if isinstance(item_stub, str):
        item_stub = {'id': item_stub}
    for key in item_stub:
        if key not in fields:
            raise ValueError('Unknown field in item stub: {!r}'.format(key))
    try:
        plugin, item_id = item_stub['id'].split(':')
    except ValueError as e:
        raise ValueError('Could not parse item ID {!r}'.format(item_stub['id'])) from e
    item = items[plugin][item_id]
    if 'damage' in item_stub:
        assert 'effect' not in item_stub
        assert 'tagValue' not in item_stub
        if isinstance(item_stub['damage'], list):
            for damage_value in item_stub['damage']:
                assert isinstance(damage_value, int)
                assert str(damage_value) in item['damageValues']
        elif isinstance(item_stub['damage'], int):
            assert str(item_stub['damage']) in item['damageValues']
        else:
            raise TypeError('Damage must be a number or array')
    if 'effect' in item_stub:
        assert 'damage' not in item_stub
        assert 'tagValue' not in item_stub
        try:
            effect_plugin, effect_id = item_stub['effect'].split(':')
        except ValueError as e:
            raise ValueError('Could not parse effect ID {!r}'.format(item_stub['effect'])) from e
        assert effect_id in item['effects'][effect_plugin]
    if 'tagValue' in item_stub:
        assert 'damage' not in item_stub
        assert 'effect' not in item_stub
        if item_stub['tagValue'] is None:
            assert '' in item['tagVariants']
        else:
            assert str(item_stub['tagValue']) in item['tagVariants']
    if 'consumed' in item_stub:
        if not isinstance(item_stub['consumed'], bool):
            validate_item_stub(item_stub['consumed'], must_be_block, must_be_item, items=items)
    if 'amount' in item_stub:
        assert isinstance(item_stub['amount'], int)
    if must_be_block:
        assert 'blockID' in item
    if must_be_item:
        assert 'itemID' in item

def test(f):
    tests.append(f)
    return f

@test
def test_grid_image_sizes():
    for image_path in pathlib.Path('img/grid').iterdir():
        if image_path.suffix == '.png':
            img = PIL.Image.open(str(image_path))
            assert img.size == (32, 32)

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

@test
def validate_items_json():
    mining = []
    tool_stubs = []
    item_stubs = []

    def validate_item(item_id, item, *, damage=None, effect_plugin=None, effect_id=None, tag_path=None, tag_value=None):
        item_fields = {
            'name',
            'solid',
            'image',
            'blockID',
            'itemID',
            'damageValues',
            'effects',
            'tagPath',
            'tagVariants',
            'obtaining',
            'dropsSelf',
            'whenPlaced',
            'creativeMenu',
            'pickBlock',
            'durability',
            'stackable',
            'alwaysGlow'
        }
        override_count = 0
        if damage is not None:
            override_count += 1
        if effect_plugin is not None or effect_id is not None:
            assert effect_plugin is not None
            assert effect_id is not None
            override_count += 1
        if tag_path is not None or tag_value is not None:
            assert tag_path is not None
            assert tag_value is not None
            override_count += 1
        assert override_count < 2
        is_override = override_count > 0
        for key in item:
            if key not in item_fields:
                raise ValueError('Unknown field in item info: {!r}'.format(key))
        assert 'name' in item
        if 'solid' in item:
            assert 'blockID' in item # is_block
            assert item['solid'] is False
        pass # image
        if 'blockID' in item:
            is_block = True
            assert isinstance(item['blockID'], int) or (is_override and item['blockID'] is None)
        else:
            is_block = False
        if 'itemID' in item:
            is_item = True
            assert isinstance(item['itemID'], int) or (is_override and item['itemID'] is None)
        else:
            is_item = False
        assert is_block or is_item
        if 'damageValues' in item:
            assert not is_override
            assert 'effects' not in item
            assert 'tagName' not in item
            assert 'tagVariants' not in item
            for damage, damaged_item in item['damageValues'].items():
                item_copy = item.copy()
                item_copy.update(damaged_item)
                del item_copy['damageValues']
                validate_item(item_id, item_copy, damage=int(damage))
        if 'effects' in item:
            assert not is_override
            assert 'damageValues' not in item
            assert 'tagName' not in item
            assert 'tagVariants' not in item
            for effect_plugin, effects in item['effects'].items():
                for effect_id, effect in effects.items():
                    item_copy = item.copy()
                    item_copy.update(effect)
                    del item_copy['effects']
                    validate_item(item_id, item_copy, effect_plugin=effect_plugin, effect_id=effect_id)
        if 'tagPath' in item:
            assert 'tagVariants' in item
        if 'tagVariants' in item:
            assert 'tagPath' in item
            assert isinstance(item['tagPath'], list)
            for tag_path_elt in item['tagPath']:
                assert isinstance(tag_path_elt, str)
            assert not is_override
            assert 'damageValues' not in item
            assert 'effects' not in item
            for tag_value, variant in item['tagVariants'].items():
                item_copy = item.copy()
                item_copy.update(variant)
                del item_copy['tagPath']
                del item_copy['tagVariants']
                validate_item(item_id, item_copy, tag_path=item['tagPath'], tag_value=tag_value)
        if 'obtaining' in item:
            assert isinstance(item['obtaining'], list)
            for method in item['obtaining']:
                if method['type'] == 'craftingShaped':
                    assert is_item
                    assert isinstance(method['recipe'], list)
                    assert len(method['recipe']) == 9
                    for item_stub in method['recipe']:
                        item_stubs.append((item_stub, False, True))
                    pass #TODO test for recipe offset
                    if 'outputAmount' in method:
                        assert isinstance(method['outputAmount'], int)
                        assert method['outputAmount'] > 1
                elif method['type'] == 'craftingShapeless':
                    assert is_item
                    assert isinstance(method['recipe'], list)
                    assert len(method['recipe']) <= 9
                    for item_stub in method['recipe']:
                        item_stubs.append((item_stub, False, True))
                    if 'outputAmount' in method:
                        assert isinstance(method['outputAmount'], int)
                        assert method['outputAmount'] > 1
                elif method['type'] == 'smelting':
                    assert is_item
                    item_stubs.append((method['input'], False, True))
                elif method['type'] == 'entityDeath':
                    assert is_item
                    #TODO uncomment the mob checks after mobs.json has been renamed to entities.json
                    #with open('json/mobs.json') as mobs_f:
                    #    mobs = json.load(mobs_f)
                    #mob = mobs['mobs'][method['entity']]
                    amount_min = 1
                    if 'amountMin' in method:
                        amount_min = method['amountMin']
                        assert isinstance(amount_min, int)
                        assert amount_min != 1
                    amount_max = 1
                    if 'amountMax' in method:
                        amount_max = method['amountMax']
                        assert isinstance(amount_max, int)
                        assert amount_max != 1
                        assert amount_max >= amount_min
                    amount_min_looting = amount_min
                    if 'amountMinLooting' in method:
                        amount_min_looting = method['amountMinLooting']
                        assert isinstance(amount_min_looting, int)
                        assert amount_min_looting > amount_min
                    amount_max_looting = amount_max
                    if 'amountMaxLooting' in method:
                        amount_max_looting = method['amountMaxLooting']
                        assert isinstance(amount_max_looting, int)
                        assert amount_max_looting > amount_max
                    if 'requires' in method:
                        assert method['requires'] in {
                            'player',
                            'chargedCreeper',
                            'skeletonArrow',
                            'whileUsing',
                            'crash',
                            'noCrash',
                            'whileWearing',
                            'halloween',
                            'onFire',
                            'notOnFire'
                        }
                    #if 'subtype' in method:
                    #    assert method['subtype'] in mob['subtypes']
                elif method['type'] == 'mining':
                    assert is_item
                    mining.append((method, False))
                elif method['type'] == 'structure':
                    assert is_block
                    if 'amount' in method:
                        assert isinstance(method['amount'], int)
                        assert method['amount'] > 0
                    with open('json/structures.json') as structures_f:
                        structures = json.load(structures_f)
                    assert method['structure'] in structures
                elif method['type'] == 'trading':
                    assert is_item
                    assert isinstance(method['profession'], int)
                    assert method['profession'] >= 0 #TODO check if the profession actually exists
                    assert isinstance(method['career'], int)
                    assert method['career'] >= 0 #TODO check if the career actually exists for the given profession
                    if 'tier' in method:
                        assert isinstance(method['tier'], int)
                        assert method['tier'] > 0
                    if isinstance(method['price'], int):
                        assert method['price'] > 0
                    else:
                        item_stubs.append((method['price'], False, True))
                    if 'priceMin' in method:
                        if isinstance(method['priceMin'], int):
                            assert method['priceMin'] > 0
                            assert method['price'] > method['priceMin']
                        else:
                            item_stubs.append((method['price'], False, True))
                    if 'additionalPrice' in method:
                        item_stubs.append((method['additionalPrice'], False, True))
                    if 'additionalPriceMin' in method:
                        assert 'additionalPrice' in method
                        item_stubs.append((method['additionalPriceMin'], False, True))
                    if 'outputAmount' in method:
                        assert isinstance(method['outputAmount'], int)
                        assert method['outputAmount'] > 1
                    if 'outputAmountMin' in method:
                        assert isinstance(method['outputAmountMin'], int)
                        assert method['outputAmountMin'] > 0
                        assert method['outputAmountMin'] < method['outputAmount']
                elif method['type'] == 'fishing':
                    assert is_item
                    assert method['category'] in ('fish', 'treasure', 'junk')
                    if 'weight' in method:
                        assert isinstance(method['weight'], float)
                        assert method['weight'] < 1
                    if 'stackSize' in method:
                        assert isinstance(method['stackSize'], int)
                        assert method['stackSize'] > 1
                elif method['type'] == 'brewing':
                    assert is_item
                    item_stubs.append((method['basePotion'], False, True))
                    if isinstance(method['ingredient'], list):
                        ingredients = method['ingredient']
                    else:
                        ingredients = [method['ingredient']]
                    for ingredient in ingredients:
                        item_stubs.append((ingredient, False, True))
                elif method['type'] == 'bonusChest':
                    assert is_item
                    if 'amountMin' in method:
                        assert isinstance(method['amountMin'], int)
                        assert method['amountMin'] != 1
                    if 'amountMax' in method:
                        assert isinstance(method['amountMax'], int)
                        assert method['amountMax'] != 1
                        assert method['amountMax'] >= method.get('amountMin', 1)
                    assert isinstance(method['stacksMin'], int)
                    assert isinstance(method['stacksMax'], int)
                    if 'weight' in method:
                        assert isinstance(method['weight'], float)
                        assert method['weight'] < 1
                elif method['type'] == 'chest':
                    assert is_item
                    if 'amountMin' in item:
                        assert isinstance(item['amountMin'], int)
                        amount_min = method['amountMin']
                        assert amount_min >= 0
                        assert amount_min != 1
                    else:
                        amount_min = 1
                    if 'amountMax' in method:
                        assert isinstance(method['amountMax'], int)
                        assert method['amountMax'] >= 0
                        assert method['amountMax'] != 1
                    with open('json/structures.json') as structures_f:
                        structures = json.load(structures_f)
                    for structure in structures.values():
                        if method['structure'] in structure.get('inventories', []):
                            break
                    else:
                        raise ValueError('Error in obtaining check for method "chest": structure {!r} does not exist'.format(method['structure']))
                elif method['type'] == 'natural':
                    assert is_block
                    with open('json/biomes.json') as biomes_f:
                        biomes = json.load(biomes_f)
                    if 'biomes' in method:
                        assert method['dimension'] == 'overworld'
                        for biome in method['biomes']:
                            for biome_info in biomes['biomes'].values():
                                if biome_info['id'] == biome:
                                    break
                            else:
                                raise ValueError('Error in obtaining check for method "natural": biome {!r} does not exist'.format(biome))
                    assert method['dimension'] in ('overworld', 'nether', 'end')
                    if 'infinite' in method:
                        assert method['infinite'] is False
                elif method['type'] == 'plantGrowth':
                    assert is_block
                    item_stubs.append((method['plant'], True, False))
                    if 'amountMin' in method:
                        if method['amountMin'] is not None:
                            assert isinstance(method['amountMin'], int)
                            assert method['amountMin'] != 1
                    if 'amountMax' in method:
                        if method['amountMax'] is not None:
                            assert isinstance(method['amountMax'], int)
                            assert method['amountMax'] > method.get('amountMin', 1)
                elif method['type'] == 'modifyBlock':
                    assert is_block
                    item_stubs.append((method['block'], True, False))
                    for tool in method['tools']:
                        tool_stubs.append(tool)
                    if 'damage' in method:
                        assert isinstance(method['damage'], int)
                        assert method['damage'] >= 0
                elif method['type'] == 'useItem':
                    assert is_item
                    item_stubs.append((method['item'], False, True))
                    if 'onBlock' in method:
                        item_stubs.append((method['onBlock'], True, False))
                    if 'onEntity' in method:
                        assert 'onBlock' not in method
                        pass #TODO check if entity is in entities.json
                elif method['type'] == 'liquids':
                    assert is_block
                    item_stubs.append((method['liquid1'], True, False))
                    item_stubs.append((method['liquid2'], True, False))
                    assert method['relation'] in ('flowIntoSource',)
                elif method['type'] == 'special':
                    assert isinstance(method['description'], str)
                    if 'block' in method:
                        assert method['block'] is True
                        assert is_block
                    else:
                        assert is_item
                    assert method['renewability'] in ('finite', 'infinite', 'manual', 'fullyAuto')
                else:
                    raise ValueError('Unknown method of obtaining: {!r}'.format(method['type']))
        if 'dropsSelf' in item:
            assert is_block and is_item
            if isinstance(item['dropsSelf'], int) or isinstance(item['dropsSelf'], float):
                assert 0 <= item['dropsSelf'] < 1
            else:
                if isinstance(item['dropsSelf'], list):
                    drops_self = item['dropsSelf']
                else:
                    drops_self = [item['dropsSelf']]
                for method in drops_self:
                    if isinstance(method, str) or 'id' in method:
                        tool_stubs.append(method)
                    else:
                        mining.append((method, True))
        if 'whenPlaced' in item:
            assert is_item
            item_stubs.append((item['whenPlaced'], True, False))
        if 'creativeMenu' in item:
            assert is_item
            assert item['creativeMenu'] is False
        if 'pickBlock' in item:
            assert is_block and is_item
            creative_menu = item.get('creativeMenu', True)
            assert isinstance(item['pickBlock'], bool)
            assert item['pickBlock'] != creative_menu
        if 'durability' in item:
            assert is_item
            assert damage is None
            assert 'damageValues' not in item
            assert isinstance(item['durability'], int)
            assert item['durability'] >= 0
        if 'stackable' in item:
            assert is_item
            assert isinstance(item['stackable'], bool) or (isinstance(item['stackable'], int) and item['stackable'] > 0)
        if 'alwaysGlow' in item:
            assert is_item
            assert item['alwaysGlow'] is True

    with open('json/items.json') as items_f:
        items = json.load(items_f)
    for plugin, plugin_items in items.items():
        for item_id, item in plugin_items.items():
            try:
                validate_item(item_id, item)
            except:
                print('Error location: item {}'.format(item_id), file=sys.stderr)
                raise
    for mining_info, is_drops_self in mining:
        mining_fields = {
            'block',
            'amountMin',
            'amountMax',
            'amountMinFortune',
            'amountMaxFortune',
            'tools',
            'excludeTools',
            'silkTouch'
        }
        if not is_drops_self:
            mining_fields.add('type')
        for key in mining_info:
            if key not in mining_fields:
                raise ValueError('Unknown field in mining info: {!r}'.format(key))
        if is_drops_self:
            assert 'block' not in mining_info
        else:
            item_stubs.append((mining_info['block'], True, False))
            amount_min = 1
            if 'amountMin' in mining_info:
                amount_min = mining_info['amountMin']
                assert isinstance(amount_min, int)
                assert amount_min != 1
            amount_max = 1
            if 'amountMax' in mining_info:
                amount_max = mining_info['amountMax']
                assert isinstance(amount_max, int)
                assert amount_max != 1
                assert amount_max >= amount_min
            amount_min_looting = amount_min
            if 'amountMinFortung' in mining_info:
                amount_min_fortune = mining_info['amountMinFortune']
                assert isinstance(amount_min_fortune, int)
                assert amount_min_fortune > amount_min
            amount_max_fortune = amount_max
            if 'amountMaxFortune' in mining_info:
                amount_max_fortune = mining_info['amountMaxFortune']
                assert isinstance(amount_max_fortune, int)
                assert amount_max_fortune > amount_max
            if 'tools' in mining_info:
                assert isinstance(mining_info['tools'], list)
                for tool in mining_info['tools']:
                    tool_stubs.append(tool)
            if 'excludeTools' in mining_info:
                assert 'tools' in mining_info
                assert mining_info['excludeTools'] is True
            if 'silkTouch' in mining_info:
                assert isinstance(mining_info['silkTouch'], bool)
    for tool_stub in tool_stubs:
        if tool_stub in (None, 'hoe', 'pickaxe', 'shovel', 'sword'):
            continue
        item_stubs.append((tool_stub, False, True))
    for item_stub, must_be_block, must_be_item in item_stubs:
        validate_item_stub(item_stub, must_be_block, must_be_item, items=items)

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
                try:
                    validate_item_stub(chest, False, True, items=items, additional_fields={
                        'exists',
                        'hasOverflow',
                        'hasSmartChest',
                        'hasSorter'
                    })
                    pass #TODO validate additional fields
                except:
                    print('Error location: floor {} corridor {} chest {}: {}'.format(y, x, z, chest['id']), file=sys.stderr)
                    raise

def run_tests():
    for test in tests:
        test()

if __name__ == '__main__':
    run_tests()
