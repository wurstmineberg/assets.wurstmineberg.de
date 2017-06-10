function getUserName() {
    var user;
    var url = $(location).attr('pathname');
    if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
    }
    var username = url.substring('/people/'.length, url.length).toLowerCase();
    return username;
}

function initializeInventory(tbody, rows, cols) {
    for (var row = 0; row < rows; row++) {
        tbody.append('<tr class="inv-row inv-row-' + row + '"></tr>');
    }
    for (var col = 0; col < cols; col++) {
        tbody.children('tr.inv-row').append($('<td>', {class: 'inv-cell inv-cell-' + col}).html($('<div>', {class: 'inv-cell-style'}).html($('<div>', {class: 'inv-cell-image'}))));
    }
}

function displaySlot(cell, stack, items, stringData, enchData) {
    var baseItem = items.itemById(stack.id);
    var item = baseItem;
    if ('damageValues' in baseItem) {
        item = items.itemByDamage(stack.id, stack.Damage);
    } else if ('effects' in baseItem) {
        item = items.itemByEffect(stack.id, stack.tag.Potion);
    } else if ('tagPath' in baseItem) {
        var tag = _.reduce(baseItem.tagPath, function(memo, pathElt) {
            if (typeof memo === 'undefined') {
                return undefined;
            }
            return memo[pathElt];
        }, stack.tag);
        if (typeof tag === 'undefined') {
            tag = null;
        }
        item = items.itemByTag(stack.id, tag);
    }
    cell.children('div').children('.inv-cell-image').append(item.htmlImage('', 'tag' in stack && 'display' in stack.tag && 'color' in stack.tag.display ? stack.tag.display.color : null, stack.Damage));
    // base name
    var name = item.name || stack.id.toString();
    // map id / armor color
    if (item.id == 'minecraft:filled_map') {
        name += ' #' + stack.Damage;
    } else if ('tag' in stack && 'display' in stack.tag && 'color' in stack.tag.display) {
        name += ' #' + zeroFill(stack.tag.display.color.toString(16), 6);
    }
    // title
    if ('tag' in stack) {
        if ('display' in stack.tag && 'Name' in stack.tag.display) {
            name += ' “' + stack.tag.display.Name + '”';
        } else if ('title' in stack.tag) {
            name += ' “' + stack.tag.title + '”';
            if ("author" in stack.tag) {
                name += ' by ' + stack.tag.author;
            }
        }
    }
    // enchantments / patterns / contents
    if ('tag' in stack) {
        var enchantments = [];
        if ('ench' in stack.tag) {
            enchantments = stack.tag.ench;
        } else if ('StoredEnchantments' in stack.tag) {
            enchantments = stack.tag.StoredEnchantments;
        }
        if (enchantments.length > 0) {
            name += ' (';
            var first = true;
            enchantments.forEach(function(ench) {
                if (first) {
                    first = false;
                } else {
                    name += ', ';
                }
                var found = false;
                $.each(enchData.enchantments, function(pluginID, pluginEnchantments) {
                    if (found) {
                        return;
                    }
                    $.each(pluginEnchantments, function(enchID, enchInfo) {
                        if (found) {
                            return;
                        }
                        if (enchInfo.numericID == ench.id) {
                            found = true;
                            name += enchInfo.name;
                            if (ench.lvl != 1 || enchInfo.maxLevel != 1) {
                                name += ' ' + (ench.lvl.toString() in enchData.levels ? enchData.levels[ench.lvl.toString()] : ench.lvl.toString());
                            }
                        }
                    });
                });
                if (!found) {
                    name += '<' + ench.id + '> ' + (ench.lvl.toString() in enchData.levels ? enchData.levels[ench.lvl.toString()] : ench.lvl.toString());
                }
            });
            name += ')';
        } else if ('BlockEntityTag' in stack.tag && 'Patterns' in stack.tag.BlockEntityTag && stack.tag.BlockEntityTag.Patterns.length > 0) {
            name += ' (';
            var first = true;
            stack.tag.BlockEntityTag.Patterns.forEach(function(pattern) {
                if (first) {
                    first = false;
                } else {
                    name += ', ';
                }
                name += stringData.items.colors[pattern.Color] + ' ' + stringData.items.bannerPatterns[pattern.Pattern];
            });
            name += ')';
        } else if ('BlockEntityTag' in stack.tag && 'Items' in stack.tag.BlockEntityTag) {
            if (stack.tag.BlockEntityTag.Items.length == 1) {
                name += ' (1 item stack)';
            } else {
                name += ' (' + stack.tag.BlockEntityTag.Items.length + ' item stacks)';
            }
        }
    }
    cell.children('div').attr('title', name);
    cell.children('div').tooltip();
    // durability
    if (stack.Damage > 0 && item.durability > 0) {
        var durability = (item.durability - stack.Damage) / item.durability;
        cell.children('div').append($('<div>', {class: 'durability'}).html($('<div>').css({
            'background-color': 'hsl(' + Math.floor(durability * 120) + ', 100%, 50%)',
            width: Math.floor(durability * 14) * 2 + 'px'
        })));
    }
    if ('Count' in stack && stack.Count > 1) {
        cell.children('div').append('<span class="count">' + stack.Count + '</span>');
    }
}

function displayInventory(playerData, items, stringData, enchData) {
    $('tr.loading').remove();
    $('.inventory-opt-out').removeClass('inventory-opt-out').addClass('inventory-opt-in');
    initializeInventory($('#main-inventory > tbody'), 3, 9);
    initializeInventory($('#hotbar-table > tbody'), 1, 9);
    initializeInventory($('#ender-chest-table > tbody'), 3, 9);
    initializeInventory($('#offhand-slot-table > tbody'), 1, 1);
    initializeInventory($('#armor-table > tbody'), 1, 4);
    playerData.Inventory.forEach(function(stack) {
        if ('Slot' in stack) {
            var cell = undefined;
            if (stack.Slot == -106) {
                cell = $('#offhand-slot-table .inv-row-0 .inv-cell-0');
            } else if (stack.Slot >= 0 && stack.Slot < 9) {
                cell = $('#hotbar-table .inv-row-0 .inv-cell-' + stack.Slot);
            } else if (stack.Slot >= 9 && stack.Slot < 36) {
                cell = $('#main-inventory .inv-row-' + (Math.floor(stack.Slot / 9) - 1) + ' .inv-cell-' + (stack.Slot % 9));
            } else if (stack.Slot >= 100 && stack.Slot < 104) {
                cell = $('#armor-table .inv-row-0 .inv-cell-' + (103 - stack.Slot));
            }
            if (cell !== undefined) {
                displaySlot(cell, stack, items, stringData, enchData);
            }
        }
    });
    playerData.EnderItems.forEach(function(stack) {
        if ('Slot' in stack && stack['Slot'] >= 0 && stack['Slot'] < 27) {
            var cell = $('#ender-chest-table .inv-row-' + Math.floor(stack['Slot'] / 9) + ' .inv-cell-' + (stack['Slot'] % 9));
            displaySlot(cell, stack, items, stringData, enchData);
        }
    });
}

function displayProfileData(person, items, people, statData) {
    // Date of Whitelisting
    if (person.joinDate) {
        $('#profile-stat-row-dow').children('.value').text(formatDate(person.joinDate));
    } else {
        $('#profile-stat-row-dow').children('.value').html($('<span>', {class: 'muted'}).text('not yet'));
    }
    // Favorite Color
    if (person.favColor) {
        var favColorCSS = 'rgb(' + person.favColor.red + ', ' + person.favColor.green + ', ' + person.favColor.blue + ')';
        var favColorName = '#' + zeroFill(person.favColor.red.toString(16), 2) + zeroFill(person.favColor.green.toString(16), 2) + zeroFill(person.favColor.blue.toString(16), 2) + ' (' + person.favColor.red + ' ' + person.favColor.green + ' ' + person.favColor.blue + ')';
        var $colorDisplay = $('<span>', {class: 'color-display'}).html($('<span>', {class: 'color-field'}).css('background-color', favColorCSS));
        $colorDisplay.append(favColorName);
        $('#profile-stat-row-fav-color').children('.value').html($colorDisplay);
    } else {
        $('#profile-stat-row-fav-color').children('.value').html($('<span>', {class: 'muted'}).text('none'));
    }
    // Favorite Item
    var fav_item = items.favItem(person);
    if (fav_item) {
        $('#profile-stat-row-fav-item').children('.value').html(fav_item.htmlImage() + fav_item.name);
    } else {
        $('#profile-stat-row-fav-item').children('.value').html($('<span>', {class: 'muted'}).text('none'));
    }
    // Invited By
    if (person.invitedBy) {
        $('#profile-stat-row-invited-by').children('.value').html($('<a>', {href: '/people/' + person.invitedBy}).text(person.invitedBy));
        $.when(people.personById(person.invitedBy)).done(function(invitedBy) {
            $('#profile-stat-row-invited-by').children('.value').html(htmlPlayerList([invitedBy]));
        }).fail(function() {
            $('#profile-stat-row-invited-by').children('.value').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
        });
    } else if (person.status == 'founding') {
        $('#profile-stat-row-invited-by').children('.value').html($('<span>', {class: 'muted'}).text('no one (founding member)'));
    } else {
        $('#profile-stat-row-invited-by').children('.value').html($('<span>', {class: 'text-danger'}).text('unknown'));
    }
    // Last Death
    $.when(person.latestDeath()).done(function(lastDeath) {
        if (lastDeath) {
            $('#profile-stat-row-last-death').children('.value').text(formatDate(lastDeath.timestamp, true) + ', ' + lastDeath.cause);
        } else if ('stat.deaths' in statData && statData['stat.deaths'] > 0) {
            $('#profile-stat-row-last-death').children('.value').html($('<span>', {class: 'muted'}).text('not recorded'));
        } else {
            $('#profile-stat-row-last-death').children('.value').html($('<span>', {class: 'muted'}).text(person.status in ['founding', 'invited', 'later', 'postfreeze'] ? 'not yet' : 'never'));
        }
    }).fail(function() {
        $('#profile-stat-row-last-death').children('.value').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
    // Last Seen
    $.when(API.serverStatus(), API.lastSeen(person)).done(function(status, lastSeen) {
        if (person.id in status.list) {
            $('#profile-stat-row-last-seen').children('.value').text('currently online');
        } else if (lastSeen) {
            $('#profile-stat-row-last-seen').children('.value').text(formatDate(lastSeen, true));
        } else {
            $('#profile-stat-row-last-seen').children('.value').html($('<span>', {class: 'muted'}).text(person.status in ['founding', 'invited', 'later', 'postfreeze'] ? 'not yet' : 'never'));
        }
    }).fail(function() {
        $('#profile-stat-row-last-seen').children('.value').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
    // People “Invited” (pre-freeze)
    var peopleInvited = people.list.filter(function(otherPerson) {
        return (otherPerson.invitedBy == person.id && otherPerson.joinDate < dateObjectFromUTC('2013-11-02T17:33:45+0000'));
    });
    $('#profile-stat-row-people-invited-prefreeze').children('.value').html(peopleInvited.length ? htmlPlayerList(peopleInvited) : $('<span>', {class: 'muted'}).text('no one'));
    // People Invited (post-freeze)
    var peopleInvited = people.list.filter(function(otherPerson) {
        return (otherPerson.invitedBy == person.id && otherPerson.joinDate >= dateObjectFromUTC('2013-11-02T17:33:45+0000'));
    });
    $('#profile-stat-row-people-invited').children('.value').html(peopleInvited.length ? htmlPlayerList(peopleInvited) : $('<span>', {class: 'muted'}).text('no one'));
    // Status
    function statusDisplay(status) {
        if (status == 'later') {
            if (new Date() - person.joinDate < 1000 * 60 * 60 * 24 * 7) { // whitelisted less than a week ago
                return 'new member (may still be <a href="//wiki.' + host + '/Invitations#Hard_requirements">vetoed</a>)';
            } else if (person.joinDate < dateObjectFromUTC('2013-11-02T17:33:45+0000')) {
                return 'later member (pre-<a href="//wiki.' + host + '/Invitations#History">freeze</a>)';
            } else {
                return 'later member (post-<a href="//wiki.' + host + '/Invitations#History">freeze</a>)';
            }
        }
        var statuses = {
            former: 'former member (unwhitelisted for inactivity)',
            founding: 'founding member',
            invited: 'invited but not whitelisted yet',
            vetoed: 'former member (unwhitelisted by <a href="//wiki.' + host + '/Invitations#Hard_requirements">veto</a>)'
        };
        return status in statuses ? statuses[status] : status;
    }
    $('#profile-stat-row-status').children('.value').html(statusDisplay(person.status));
}

function displayStatData(person, statData, stringData, itemData, achievementData, biomes, entityData) {
    var $loadingStatGeneral = $('#loading-stat-general-table');
    var $loadingStatBlock = $('#loading-stat-blocks-table');
    var $loadingStatItem = $('#loading-stat-items-table');
    var $loadingStatMobs = $('#loading-stat-mobs-table');
    var $loadingStatAchievements = $('#loading-stat-achievements-table');

    var general = [];
    var blocks = {};
    var items = {};
    var mobs = [];
    var achievements = [];

    $.each(statData, function(categoryName, category) {
        if (categoryName === 'stat') {
            $.each(category, function(statName, stat) {
                if (statName === 'craftItem' || statName === 'useItem' || statName === 'breakItem' || statName === 'mineBlock' || statName === 'pickup' || statName === 'drop') {
                    $.each(stat, function(pluginName, plugin) {
                        if (pluginName !== 'summary') {
                            $.each(plugin, function(itemName, value) {
                                var item = itemData.itemById(pluginName + ':' + itemName);
                                var name = item.name || item.id;
                                var collection = item.isBlock ? blocks : items;
                                if (!(item.id in collection)) {
                                    collection[item.id] = {name: name};
                                    if (item) {
                                        collection[item.id].itemInfo = item;
                                    };
                                }
                                collection[item.id][statName] = value;
                            });
                        }
                    });
                } else if (statName === 'killEntity' || statName === 'entityKilledBy') {
                    $.each(stat, function(mob, value) {
                        if (!/:/.test(mob)) {
                            // old-style entity ID
                            $.each(entityData, function(plugin, pluginData) {
                                $.each(pluginData, function(entityID, entityInfo) {
                                    if ('oldID' in entityInfo && entityInfo.oldID == mob) {
                                        if ('wasSubtype' in entityInfo && entityInfo.wasSubtype) {
                                            return;
                                        }
                                        mob = plugin + ':' + entityID;
                                    }
                                });
                            });
                        }
                        var name = mob;
                        var plugin = mob.split(':')[0];
                        var shortID = mob.split(':')[1];
                        if (plugin in entityData && shortID in entityData[plugin] && 'name' in entityData[plugin][shortID]) {
                            name = entityData[plugin][shortID].name;
                        };

                        var found = false;
                        mobs.forEach(function(entry) {
                            if (entry.id === mob) {
                                entry[statName] = value;
                                found = true;
                            }
                        });

                        if (!found) {
                            var newEntry = {
                                id: mob,
                                name: name
                            };
                            newEntry[statName] = value;
                            mobs.push(newEntry);
                        };
                    });
                } else {
                    var finalKey = statName;
                    var finalValue = prettifyStatsValue(statName, stat);
                    if ('stats' in stringData && 'general' in stringData.stats && statName in stringData.stats.general) {
                        finalKey = stringData.stats.general[statName];
                    }
                    general.push({
                        name: finalKey,
                        value: finalValue
                    });
                }
            });
        } else if (categoryName === 'achievement') {
            $.each(category, function(achievementID, value) {
                var finalValue = value;
                if (achievementID === 'exploreAllBiomes' && 'value' in value) {
                    if (value.value > 0) {
                        finalValue = 'Yes';
                    } else {
                        var visitedBiomes = value.progress.slice(0);
                        finalValue = '<span class="achievement-list">';
                        var adventuringBiomes = _.filter(biomes.biomes, function(biome) {
                            return biome.adventuringTime;
                        });
                        _.map(adventuringBiomes, function(biome) {
                            finalValue += '<span class="achievement-value">';
                            if (_.find(visitedBiomes, function(biomeName) {
                                return biomeName === biome.id;
                            })) {
                                finalValue += '<span class="fa fa-check fa-fw text-success"></span> ';
                            } else {
                                finalValue += '<span class="fa fa-times fa-fw text-danger"></span> ';
                            };
                            finalValue += '<abbr class="nounderline achievement-name" title="' + biome.description + '">' + biome.name + '</abbr></span> ';
                        });
                        finalValue += '</span>';
                    }
                } else {
                    if (parseInt(value) >= 1) {
                        finalValue = 'Yes';
                    } else {
                        finalValue = 'No';
                    }
                }
                achievements.push({
                    achievement: new Achievement(achievementData, achievementID),
                    value: finalValue
                });
            });
        }
    });
    // Add the missing achievements
    _.keys(achievementData).forEach(function(achievementID) {
        var alreadyExisting = _.some(_.values(achievements), function(achievement) {
            return (achievementID === achievement.achievement.id);
        });
        if (!alreadyExisting) {
            achievements.push({
                achievement: new Achievement(achievementData, achievementID),
                value: 'No'
            });
        };
    });

    general.sort(function(a, b) {
        nameA = a.name;
        nameB = b.name;
        return nameA.localeCompare(nameB);
    });

    mobs.sort(function(a, b) {
        nameA = a.name;
        nameB = b.name;
        return nameA.localeCompare(nameB);
    });

    achievements.sort(function(a, b) {
        if (a.achievement.root.id < b.achievement.root.id) {
            return 1;
        } else if (a.achievement.root.id > b.achievement.root.id) {
            return -1;
        } else {
            return a.achievement.sortIndex() - b.achievement.sortIndex();
        }
    });

    $.each(general, function(index, dict) {
        var name = dict.name;
        var value = dict.value;
        var $row = $('<tr>', {class: 'general-row'}).append([
            $('<td>', {class: 'name'}).text(name),
            $('<td>').text(value)
        ]);
        $loadingStatGeneral.before($row);
    });

    $.each(mobs, function(index, mobDict) {
        var name = mobDict.name;
        var id = mobDict.id;
        var $row = $('<tr>', {class: 'mob-row'}).append([
            $('<td>', {class: 'name'}),
            $('<td>', {class: 'killed'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'killed-by'}).html($('<span>', {class: 'muted'}).text('0'))
        ]);
        $loadingStatMobs.before($row);
        $row.children('.name').text(name);
        if ('killEntity' in mobDict) {
            $row.children('.killed').text(mobDict.killEntity);
        }
        if ('entityKilledBy' in mobDict) {
            $row.children('.killed-by').text(mobDict.entityKilledBy);
        }
    });

    _.each(_.sortBy(_.pairs(items), function(pair) {
        return pair[0];
    }), function(pair) {
        var itemDict = pair[1];
        var $row = $('<tr>', {
                class: 'item-row'
            }).append([
            $('<td>', {class: 'image'}),
            $('<td>', {class: 'name'}).text(itemDict.name),
            $('<td>', {class: 'crafted'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'used'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'depleted'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'dropped'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'picked-up'}).html($('<span>', {class: 'muted'}).text('0'))
        ]);
        $loadingStatItem.before($row);
        if ('itemInfo' in itemDict) {
            $row.children('.image').html(itemDict.itemInfo.htmlImage('item-image'));
        }
        if ('craftItem' in itemDict) {
            $row.children('.crafted').text(thousands(itemDict.craftItem));
        }
        if ('useItem' in itemDict) {
            $row.children('.used').text(thousands(itemDict.useItem));
        }
        if ('breakItem' in itemDict) {
            $row.children('.depleted').text(thousands(itemDict.breakItem));
        }
        if ('drop' in itemDict) {
            $row.children('.dropped').text(thousands(itemDict.drop));
        }
        if ('pickup' in itemDict) {
            $row.children('.picked-up').text(thousands(itemDict.pickup));
        }
    });

    _.each(_.sortBy(_.pairs(blocks), function(pair) {
        return pair[0];
    }), function(pair) {
        var blockDict = pair[1];
        var $row = $('<tr>', {
            class: 'block-row'
        }).append([
            $('<td>', {class: 'image'}),
            $('<td>', {class: 'name'}).text(blockDict.name),
            $('<td>', {class: 'crafted'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'used'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'mined'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'dropped'}).html($('<span>', {class: 'muted'}).text('0')),
            $('<td>', {class: 'picked-up'}).html($('<span>', {class: 'muted'}).text('0'))
        ]);
        $loadingStatBlock.before($row);
        if ('itemInfo' in blockDict) {
            $row.children('.image').html(blockDict.itemInfo.htmlImage('item-image'));
        }
        if ('craftItem' in blockDict) {
            $row.children('.crafted').text(thousands(blockDict.craftItem));
        }
        if ('useItem' in blockDict) {
            $row.children('.used').text(thousands(blockDict.useItem));
        }
        if ('mineBlock' in blockDict) {
            $row.children('.mined').text(thousands(blockDict.mineBlock));
        }
        if ('drop' in blockDict) {
            $row.children('.dropped').text(thousands(blockDict.drop));
        }
        if ('pickup' in blockDict) {
            $row.children('.picked-up').text(thousands(blockDict.pickup));
        }
    });

    $.when(API.advancementsOverview(), API.personAdvancementsData(person)).done(function(advancementsOverview, advancementsData) {
        $('.loading-stat').remove();
        $('#tab-stats-achievements').text('Advancements');
        $('#stats-achievements').html($('<table>', {id: 'stats-advancements-table', class: 'table table-responsive stats-table'}).html([
            $('<thead>').html($('<tr>').html([
                $('<th>').html('&nbsp;'),
                $('<th>').text('Advancement'),
                $('<th>').text('Value')
            ])),
            $('<tbody>').html($('<tr>', {id: 'loading-stat-advancements-table', class: 'loading-stat'}).html($('<td>', {colspan: '3'}).text('Loading advancements data…')))
        ]));
        $.each(advancementsOverview, function(tab, tabAdvancements) {
            if (tab !== 'recipes') {
                $.each(tabAdvancements, function(advancementName, advancementDefinitionFile) {
                    var advancementPath = 'minecraft:' + tab + '/' + advancementName;
                    var complete = false;
                    var valueHTML = $('<span>', {class: 'fa fa-times fa-fw text-danger'});
                    if (advancementPath in advancementsData) {
                        if (advancementsData[advancementPath].done) {
                            complete = true;
                            valueHTML = $('<span>', {class: 'fa fa-check fa-fw text-success'});
                        }
                    }
                    var rowID = 'advancement-row-' + tab + '-' + advancementName;
                    $('#loading-stat-advancements-table').before($('<tr>', {id: rowID, class: 'advancement-row'}).html([
                        $('<td>', {class: 'image'}),
                        $('<td>', {class: 'name'}).text(advancementPath),
                        $('<td>', {class: 'value'}).html(valueHTML)
                    ]));
                    $.when(API.advancement(advancementPath), API.lang()).done(function(advancementInfo, lang) {
                        $('#' + rowID).children('.image').html(advancementImage(advancementInfo, itemData, complete));
                        $('#' + rowID).children('.name').html([
                            renderTellraw(advancementInfo.display.title, lang),
                            $('<br>'),
                            $('<span>', {class: 'muted'}).html(renderTellraw(advancementInfo.display.description, lang))
                        ]);
                    });
                });
            }
        });
        $('#loading-stat-advancements-table').remove();
    }).fail(function() {
        _.each(achievements, function(dict) {
            value = dict.value;
            if (value === 'Yes') {
                value = $('<span>', {class: 'fa fa-check fa-fw text-success'});
            } else if (value === 'No') {
                value = $('<span>', {class: 'fa fa-times fa-fw text-danger'});
            }
            var $row = $('<tr>', {id: 'achievement-row-' + dict.achievement.id, class: 'achievement-row'}).html([
                $('<td>').html(dict.achievement.image(itemData)),
                $('<td>', {class: 'name'}).html($('<a>', {
                    href: '#',
                    'data-toggle': 'tooltip',
                    'data-placement': 'right',
                    rel: 'tooltip',
                    class: 'text-link',
                    title: dict.achievement.description
                }).html(dict.achievement.displayName)),
                $('<td>', {class: 'value'}).html(value)
            ]);
            $loadingStatAchievements.before($row);
        });
        $('.loading-stat').remove();
    });
    initializeTooltips();
}

function displayMinigameData(people, person, deathGamesLog) {
    // Achievement Run
    $.when(people.achievementWinners()).done(function(winners) {
        winners = _.sortBy(winners, 'player');
        for (var index = 0; index < winners.length; index++) {
            if (winners[index].player.id === person.id) {
                break;
            }
        }
        if (index < winners.length) {
            var suffix = 'th';
            if ((index + 1).toString().endsWith('1')) {
                suffix = 'st';
            } else if ((index + 1).toString().endsWith('2')) {
                suffix = 'nd';
            } else if ((index + 1).toString().endsWith('3')) {
                suffix = 'rd';
            }
            $('#minigames-stat-row-achievementrun-place').children('.value').html((index + 1) + suffix + ' (completed on ' + winners[index].value);
            if (index > 0 || winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(', ');
            }
            if (index > 0) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append('after ');
                $('#minigames-stat-row-achievementrun-place').children('.value').append(htmlPlayerList([winners[index - 1].player]));
            }
            if (index > 0 && winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(', ');
            }
            if (winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append('before ');
                $('#minigames-stat-row-achievementrun-place').children('.value').append(htmlPlayerList([winners[index + 1].player]));
            }
            if (index > 0 || winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(')');
            }
        } else {
            $.when(people.achievementScores(), API.achievementData()).done(function(achievementScores, achievementData) {
                achievementScores.forEach(function(scoreInfo) {
                    if (scoreInfo.player.id == person.id) {
                        $('#minigames-stat-row-achievementrun-place').children('.value').html($('<span>', {class: 'muted'}).text('not yet ranked (' + scoreInfo.value + ' of ' + _.keys(achievementData).length + ' completed)'));
                    }
                });
            }).fail(function() {
                $('#minigames-stat-row-achievementrun-place').children('.value').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
            });
        }
    }).fail(function() {
        $('#minigames-stat-row-achievementrun-place').children('.value').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
    // Death Games
    var log = deathGamesLog.log;
    var participating = people.activePeople;
    if ('participating' in deathGamesLog) {
        if (deathGamesLog.participating.indexOf(person.id) > -1) {
            participating = people.sorted(deathGamesLog.participating);
        } else {
            participating = undefined;
        }
    }
    if (typeof participating === 'undefined') {
        $('#minigames-stats-table-deathgames').replaceWith($('<p>', {'class': 'muted'}).text('Not participating.'));
    } else {
        var stats = {
            kills: function(person) {
                return log.filter(function(logEntry) {
                    if (logEntry.success) {
                        return (logEntry.attacker == person.id);
                    } else {
                        return (logEntry.target == person.id);
                    }
                }).length;
            },
            deaths: function(person) {
                return log.filter(function(logEntry) {
                    if (logEntry.success) {
                        return (logEntry.target == person.id);
                    } else {
                        return (logEntry.attacker == person.id);
                    }
                }).length;
            },
            diamonds: function(person) {
                ret = 0;
                log.forEach(function(logEntry) {
                    if (logEntry.attacker == person.id) {
                        if (logEntry.success) {
                            ret++;
                        } else {
                            ret--;
                        }
                    } else if (logEntry.target == person.id) {
                        if (logEntry.success) {
                            ret--;
                        } else {
                            ret++;
                        }
                    }
                });
                return ret;
            },
            attacks: function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.attacker == person.id);
                }).length;
            },
            'attacks-success': function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.attacker == person.id && logEntry.success);
                }).length;
            },
            'attacks-fail': function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.attacker == person.id && !logEntry.success);
                }).length;
            },
            defense: function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.target == person.id);
                }).length;
            },
            'defense-success': function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.target == person.id && !logEntry.success);
                }).length;
            },
            'defense-fail': function(person) {
                return log.filter(function(logEntry) {
                    return (logEntry.target == person.id && logEntry.success);
                }).length;
            }
        }
        $.each(stats, function(statName, statFunction) {
            var value = statFunction(person);
            var statRow = $('#minigames-stat-row-deathgames-' + statName);
            if (value === null) {
                statRow.children('.value').html('');
            } else {
                statRow.children('.value').html(value);
            }
        });
    }
}

function loadStatData(person, stringData, achievementData, biomes, items, entityData) {
    if (person.option('show_inventory') || person.id === currentUser) {
        $.when(API.playerData(person), API.enchantmentData()).done(function(playerData, enchData) {
            displayInventory(playerData, items, stringData, enchData);
        }).fail(function() {
            $('.inventory-table .loading td').html('Error: Could not load ' + person.minecraft + '.dat');
        });
    } else if (person.optionIsDefault('show_inventory')) {
        $('.panel').before('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Want to show you inventory?</strong> Since you have not set a preference for this, your inventory and Ender chest will be displayed on this page once we get everything working. You can activate this feature now using the command <code>!<a href="//wiki.' + host + '/Commands#Option">Option</a> show_inventory on</code>, or permanently deactivate it with <code>!<a href="//wiki.' + host + '/Commands#Option">Option</a> show_inventory off</code>.</div>');
    }
    $.when(API.personStatData(person)).done(function(statData) {
        displayStatData(person, statData, stringData, items, achievementData, biomes, entityData);
    }).fail(function() {
        $('.loading-stat').html('<td colspan="7">Error: Could not load ' + person.minecraft + '.json</td>');
    });
}

function loadUserData() {
    var username = getUserName();
    document.title = username + ' on Wurstmineberg';
    $.when(API.personById(username)).done(function(person) {
        $.when(API.stringData(), API.achievementData(), API.biomes(), API.items(), API.people(), API.entityData()).done(function(stringData, achievementData, biomes, items, people, entityData) {
            document.title = person.interfaceName + ' on Wurstmineberg';
            loadStatData(person, stringData, achievementData, biomes, items, entityData);
            $.when(API.personStatData(person)).done(function(statData) {
                displayProfileData(person, items, people, statData);
            }).fail(function() {
                displayProfileData(person, items, people, {});
            });
            $.when(API.deathGamesLog()).done(function(deathGamesLog) {
                displayMinigameData(people, person, deathGamesLog);
            }).fail(function() {
                $('#minigames-stats-table-deathgames').replaceWith($('<p>', {'class': 'text-danger'}).text('Failed to load Death Games log. Refresh to try again.'));
            });
        }).fail(function(deferred, error, description) {
            if (isDev) {
                [].slice.apply(arguments).forEach(function(arg) {
                    $('p.panel-loading').append(arg);
                });
            } else {
                $('p.panel-loading').text('Unknown error');
            }
        });
    }).fail(function() {
        $('#username').text(username).append($('<span>', {class: 'muted'}).text(' (failed to load profile)'));
        $('p.panel-loading').text('Error: User with this Wurstmineberg ID not found');
        $('.loading').text('Error: User with this name not found');
        $('.loading-stat').html($('<td>', {colspan: '7'}).text('Error: No user with ID ' + username));
    });
}

selectTabWithID("tab-stats-profile");
bindTabEvents();
loadUserData();
