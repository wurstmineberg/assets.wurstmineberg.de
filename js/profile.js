function getUserName() {
    var user;
    var url = $(location).attr('pathname');
    if (url == '/people/') {
        window.location.replace('/people');
    }
    if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
    }
    var username = url.substring('/people/'.length, url.length).toLowerCase();
    return username;
}

function displayUserData(person) {
    $('.panel-loading').removeClass('loading');

    var name = person.interfaceName;
    var head;

    $('#avatar').replaceWith(person.html_ava(32));
    $('#username').text(name);
    $('#username').removeClass('hidden');

    if (person.minecraft) {
        $('#head').attr('src', '/assets/img/head/180/' + person.id + '.png');
        $('#head').attr('srcset', '/assets/img/head/180/' + person.id + '.png 1x, /assets/img/head/360/' + person.id + '.png 2x');
        $('#head').attr('title', person.minecraft);
        $('#head').removeClass('hidden');

        if (person.minecraft.toLowerCase() !== name.toLowerCase()) {
            $('#username').append(' ');
            $('#username').append($('<span>', {'class': 'muted'}).text('(Minecraft: ' + person.minecraft + ')'));
        }
    }

    if (person.description) {
        var description = sanitized(person.description, ['A', 'EM', 'S', 'SPAN']);
    } else {
        var description = 'You can update your description using the command <code>!<a href="//wiki.' + host + '/Commands#People">People</a> ' + person.id + ' description &lt;value&gt;...</code>.';
        $('#user-description').addClass('muted');
    }

    $('#user-description').html(description);

    var social_links = $('#social-links');
    if (person.reddit) {
        social_links.removeClass('hidden');
        social_links.append('<a class="social-link" href="' + reddit_user_link(person.reddit) + '">Reddit</a>');
    }

    if (person.twitter) {
        social_links.removeClass('hidden');
        social_links.append('<a class="social-link" href="' + twitter_user_link(person.twitter) + '">Twitter</a>');
    }

    if (person.website) {
        social_links.removeClass('hidden');
        social_links.append('<a class="social-link" href="' + person.website + '">Website</a>');
    }

    if (person.wiki) {
        social_links.removeClass('hidden');
        social_links.append('<a class="social-link" href="' + wiki_user_link(person['wiki']) + '">Wiki</a>');
    }
}

function initializeInventory(tbody, rows, cols) {
    for (var row = 0; row < rows; row++) {
        tbody.append('<tr class="inv-row inv-row-' + row + '"></tr>');
    }
    for (var col = 0; col < cols; col++) {
        tbody.children('tr.inv-row').append($('<td>', {class: 'inv-cell inv-cell-' + col}).html($('<div>', {class: 'inv-cell-style'}).html($('<div>', {class: 'inv-cell-image'}))));
    }
}

function displaySlot(cell, stack, items, stringData) {
    var baseItem = items.itemById(stack.id);
    var item = baseItem;
    if ('damageValues' in baseItem) {
        item = items.itemByDamage(stack.id, stack.Damage);
    } else if ('effects' in baseItem) {
        item = items.itemByEffect(stack.id, stack.tag.Potion);
    } else if ('tagPath' in baseItem) {
        var tag = _.reduce(baseItem.tagPath, function(memo, pathElt) { return memo[pathElt]; }, stack.tag);
        item = items.itemByTag(stack.id, tag);
    }
    cell.children('div').children('.inv-cell-image').append(item.htmlImage('', 'tag' in stack && 'display' in stack.tag && 'color' in stack.tag.display ? stack.tag.display.color : null));
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
    // enchantments / patterns
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
                name += (ench.id.toString() in stringData.enchantments.names ? stringData.enchantments.names[ench.id.toString()] : '<' + ench.id + '>') + ' ' + (ench.lvl.toString() in stringData.enchantments.levels ? stringData.enchantments.levels[ench.lvl.toString()] : ench.lvl.toString());
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
        }
    }
    cell.children('div').attr('title', name);
    cell.children('div').tooltip();
    if (stack.Damage > 0 && item.durability > 0) {
        var durability = (item.durability - stack.Damage) / item.durability;
        cell.children('div').append($('<div>', {class: 'durability'}).html($('<div>').css({
            'background-color': 'rgb(' + (255 - Math.floor(durability * 256)) + ', ' + Math.floor(durability * 256) + ', 0)',
            width: Math.floor(durability * 14) * 2 + 'px'
        })));
    }
    if ('Count' in stack && stack.Count > 1) {
        cell.children('div').append('<span class="count">' + stack.Count + '</span>');
    }
}

function displayInventory(player_data, items, string_data) {
    $('tr.loading').remove();
    $('.inventory-opt-out').removeClass('inventory-opt-out').addClass('inventory-opt-in');
    initializeInventory($('#main-inventory > tbody'), 3, 9);
    initializeInventory($('#hotbar-table > tbody'), 1, 9);
    initializeInventory($('#ender-chest-table > tbody'), 3, 9);
    initializeInventory($('#offhand-slot-table > tbody'), 1, 1);
    initializeInventory($('#armor-table > tbody'), 1, 4);
    player_data['Inventory'].forEach(function(stack) {
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
                displaySlot(cell, stack, items, string_data);
            }
        }
    });
    player_data['EnderItems'].forEach(function(stack) {
        if ('Slot' in stack && stack['Slot'] >= 0 && stack['Slot'] < 27) {
            var cell = $('#ender-chest-table .inv-row-' + Math.floor(stack['Slot'] / 9) + ' .inv-cell-' + (stack['Slot'] % 9));
            displaySlot(cell, stack, items, string_data);
        }
    });
}

function displayProfileData(person, items, people, statData) {
    // Date of Whitelisting
    if (person.joinDate) {
        $('#profile-stat-row-dow').children('.value').text(formatDate(person.joinDate));
    } else {
        $('#profile-stat-row-dow').children('.value').html($('<span>', {'class': 'muted'}).text('not yet'));
    }
    // Favorite Color
    if (person.favColor) {
        var favColorCSS = 'rgb(' + person.favColor.red + ', ' + person.favColor.green + ', ' + person.favColor.blue + ')';
        var favColorName = '#' + zeroFill(person.favColor.red.toString(16), 2) + zeroFill(person.favColor.green.toString(16), 2) + zeroFill(person.favColor.blue.toString(16), 2) + ' (' + person.favColor.red + ' ' + person.favColor.green + ' ' + person.favColor.blue + ')';
        var $colorDisplay = $('<span>', {'class': 'color-display'}).html($('<span>', {'class': 'color-field'}).css('background-color', favColorCSS));
        $colorDisplay.append(favColorName);
        $('#profile-stat-row-fav-color').children('.value').html($colorDisplay);
    } else {
        $('#profile-stat-row-fav-color').children('.value').html($('<span>', {'class': 'muted'}).text('none'));
    }
    // Favorite Item
    var fav_item = items.favItem(person);
    if (fav_item) {
        $('#profile-stat-row-fav-item').children('.value').html(fav_item.htmlImage() + fav_item.name);
    } else {
        $('#profile-stat-row-fav-item').children('.value').html($('<span>', {'class': 'muted'}).text('none'));
    }
    // Invited By
    if (person.invitedBy) {
        $('#profile-stat-row-invited-by').children('.value').html($('<a>', {'href': '/people/' + person.invitedBy}).text(person.invitedBy));
        $.when(API.personById(person.invitedBy)).done(function(invitedBy) {
            $('#profile-stat-row-invited-by').children('.value').html(html_player_list([invitedBy]));
        }).fail(function() {
            //
        });
    } else if (person.status == 'founding') {
        $('#profile-stat-row-invited-by').children('.value').html($('<span>', {'class': 'muted'}).text('no one (founding member)'));
    } else {
        $('#profile-stat-row-invited-by').children('.value').html($('<span>', {'class': 'text-danger'}).text('unknown'));
    }
    // Last Death
    $.when(person.latestDeath).done(function(lastDeath) {
        if (lastDeath) {
            $('#profile-stat-row-last-death').children('.value').text(formatDate(lastDeath.timestamp, true) + ', ' + lastDeath.cause);
        } else if ('stat.deaths' in statData && statData['stat.deaths'] > 0) {
            $('#profile-stat-row-last-death').children('.value').html($('<span>', {'class': 'muted'}).text('not recorded'));
        } else {
            $('#profile-stat-row-last-death').children('.value').html($('<span>', {'class': 'muted'}).text(person.status in ['founding', 'invited', 'later', 'postfreeze'] ? 'not yet' : 'never'));
        }
    });
    // Last Seen
    $.when(API.lastSeen(person)).done(function(lastSeen) {
        if (lastSeen == 'currentlyOnline') {
            $('#profile-stat-row-last-seen').children('.value').text('currently online');
        } else if (lastSeen) {
            $('#profile-stat-row-last-seen').children('.value').text(formatDate(lastSeen, true));
        } else {
            $('#profile-stat-row-last-seen').children('.value').html($('<span>', {'class': 'muted'}).text(person.status in ['founding', 'invited', 'later', 'postfreeze'] ? 'not yet' : 'never'));
        }
    }).fail(function() {
        $('#profile-stat-row-last-seen').children('.value').html($('<span>', {'class': 'text-danger'}).text('error, try refreshing'));
    });
    // People “Invited” (pre-freeze)
    var peopleInvited = people.list.filter(function(otherPerson) {
        return (otherPerson.invitedBy == person.id && otherPerson.joinDate < new Date('2013-11-02T17:33:45+0000'));
    });
    $('#profile-stat-row-people-invited-prefreeze').children('.value').html(peopleInvited.length ? html_player_list(peopleInvited) : $('<span>', {'class': 'muted'}).text('no one'));
    // People Invited (post-freeze)
    var peopleInvited = people.list.filter(function(otherPerson) {
        return (otherPerson.invitedBy == person.id && otherPerson.joinDate >= new Date('2013-11-02T17:33:45+0000'));
    });
    $('#profile-stat-row-people-invited').children('.value').html(peopleInvited.length ? html_player_list(peopleInvited) : $('<span>', {'class': 'muted'}).text('no one'));
    // Status
    function statusDisplay(status) {
        if (status == 'postfreeze') {
            if (new Date() - person.joinDate < 1000 * 60 * 60 * 24 * 7) { // whitelisted less than a week ago
                return 'new member (may still be <a href="http://wiki.' + host + '/Invitations#Hard_requirements">vetoed</a>)';
            }
            return 'later member (post-<a href="http://wiki.' + host + '/Invitations#History">freeze</a>)';
        }
        var statuses = {
            'former': 'former member (unwhitelisted for inactivity)',
            'founding': 'founding member',
            'invited': 'invited but not whitelisted yet',
            'later': 'later member (pre-<a href="http://wiki.' + host + '/Invitations#History">freeze</a>)',
            'vetoed': 'former member (unwhitelisted by <a href="http://wiki.' + host + '/Invitations#Hard_requirements">veto</a>)'
        };
        return status in statuses ? statuses[status] : status;
    }
    $('#profile-stat-row-status').children('.value').html(statusDisplay(person.status || 'later'));
}

function displayStatData(statData, stringData, itemData, achievementData, biomes, mobData) {
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

    $.each(statData, function(key, value) {
        stat = key.split('.');
        var name;

        if (stat[0] === 'stat') {
            if (stat[1] === 'craftItem' || stat[1] === 'useItem' || stat[1] === 'breakItem' || stat[1] === 'mineBlock') {
                var item = itemData.itemById(stat.slice(2).join(':'));
                var name = item.name || stat.slice(2).join(':');
                var actionIndex = stat[1];
                var collection = item.isBlock ? blocks : items;
                if (!(item.id in collection)) {
                    collection[item.id] = {name: name};
                    if (item) {
                        collection[item.id].itemInfo = item;
                    };
                }
                collection[item.id][actionIndex] = value;
            } else if (stat[1] === 'killEntity' || stat[1] === 'entityKilledBy') {
                var id = stat[2];
                var actionIndex = stat[1];
                var count = value;

                var name = id;
                if ('mobs' in mobData && stat[2] in mobData.mobs && 'name' in mobData.mobs[stat[2]]) {
                    name = mobData.mobs[stat[2]].name;
                };

                var found = false;
                $.each(mobs, function(key, value) {
                    if (value['id'] === id) {
                        value[actionIndex] = count;
                        found = true;
                        return;
                    }
                });

                if (!found) {
                    newEntry = {
                        id: id,
                        name: name
                    };
                    newEntry[actionIndex] = count;
                    mobs.push(newEntry);
                };
            } else {
                var finalKey = key;
                var finalValue = prettifyStatsValue(stat[1], value);
                if ('stats' in stringData && 'general' in stringData.stats && stat[1] in stringData.stats.general) {
                    finalKey = stringData.stats.general[stat[1]];
                }
                general.push({
                    name: finalKey,
                    value: finalValue
                });
            }
        } else if (stat[0] === 'achievement') {
            var id = stat[1];
            var finalValue = value;
            if (id === 'exploreAllBiomes' && 'value' in value) {
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
                achievement: new Achievement(achievementData, id),
                value: finalValue
            });
        }
    });
    // Add the missing achievements
    _.keys(achievementData).forEach(function(id) {
        var alreadyExisting = _.some(_.values(achievements), function(achievement) {
            return (id === achievement.achievement.id);
        });
        if (!alreadyExisting) {
            achievements.push({
                achievement: new Achievement(achievementData, id),
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
            $('<td>', {class: 'info'}).text(value)
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
            $('<td>', {class: 'depleted'}).html($('<span>', {class: 'muted'}).text('0'))
        ]);
        $loadingStatItem.before($row);
        if ('itemInfo' in itemDict) {
            $row.children('.image').html(itemDict.itemInfo.htmlImage('item-image'));
        }
        if ('craftItem' in itemDict) {
            $row.children('.crafted').text(itemDict.craftItem);
        }
        if ('useItem' in itemDict) {
            $row.children('.used').text(itemDict.useItem);
        }
        if ('breakItem' in itemDict) {
            $row.children('.depleted').text(itemDict.breakItem);
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
            $('<td>', {class: 'mined'}).html($('<span>', {class: 'muted'}).text('0'))
        ]);
        $loadingStatBlock.before($row);
        if ('itemInfo' in blockDict) {
            $row.children('.image').html(blockDict.itemInfo.htmlImage('item-image'));
        }
        if ('craftItem' in blockDict) {
            $row.children('.crafted').text(blockDict.craftItem);
        }
        if ('useItem' in blockDict) {
            $row.children('.used').text(blockDict.useItem);
        }
        if ('mineBlock' in blockDict) {
            $row.children('.mined').text(blockDict.mineBlock);
        }
    });

    _.each(achievements, function(dict) {
        value = dict.value;
        if (value === 'Yes') {
            value = $('<span>', {class: 'fa fa-check fa-fw text-success'});
        } else if (value === "No") {
            value = $('<span>', {class: 'fa fa-times fa-fw text-danger'});
        }
        var $row = $('<tr>', {id: 'achievement-row-' + dict.achievement.id, class: 'achievement-row'}).append([
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
    initialize_tooltips();
}

function displayMinigameData(people, person, deathGamesLog) {
    // Achievement Run
    $.when(people.achievementWinners()).done(function(winners) {
        for (var index = 0; index < winners.length; index++) {
            if (winners[index].id === person.id) {
                break;
            }
        }
        if (index == winners.length) {
            $('#minigames-stat-row-achievementrun-place').children('.value').text('not yet completed');
            //TODO add current achievement progress
        } else {
            var suffix = 'th';
            if ((index + 1).toString().endsWith('1')) {
                suffix = 'st';
            } else if ((index + 1).toString().endsWith('2')) {
                suffix = 'nd';
            } else if ((index + 1).toString().endsWith('3')) {
                suffix = 'rd';
            }
            $('#minigames-stat-row-achievementrun-place').children('.value').html((index + 1) + suffix);
            if (index > 0 || winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(' (');
            }
            if (index > 0) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append('after ');
                $('#minigames-stat-row-achievementrun-place').children('.value').append(html_player_list([winners[index - 1]]));
            }
            if (index > 0 && winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(', ');
            }
            if (winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append('before ');
                $('#minigames-stat-row-achievementrun-place').children('.value').append(html_player_list([winners[index + 1]]));
            }
            if (index > 0 || winners.length > index + 1) {
                $('#minigames-stat-row-achievementrun-place').children('.value').append(')');
            }
        }
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

function loadStatData(person, string_data, achievement_data, biomes, items, mobData) {
    if (person.option('show_inventory')) {
        $.when(API.playerData(person)).done(function(player_data) {
            displayInventory(player_data, items, string_data);
        }).fail(function() {
            $('.inventory-table .loading td').html('Error: Could not load ' + person.minecraft + '.dat');
        });
    } else if (person.option_is_default('show_inventory')) {
        $('.panel').before('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Want to show you inventory?</strong> Since you have not set a preference for this, your inventory and Ender chest will be displayed on this page once we get everything working. You can activate this feature now using the command <code>!<a href="//wiki.' + host + '/Commands#Option">Option</a> show_inventory on</code>, or permanently deactivate it with <code>!<a href="//wiki.' + host + '/Commands#Option">Option</a> show_inventory off</code>.</div>');
    }
    $.when(API.personStatData(person)).done(function(stat_data) {
        displayStatData(stat_data, string_data, items, achievement_data, biomes, mobData);
    }).fail(function() {
        $('.loading-stat').html('<td colspan="7">Error: Could not load ' + person.minecraft + '.json</td>');
    });
}

function loadUserData() {
    var username = getUserName();
    document.title = username + ' on Wurstmineberg';
    $.when(API.personById(username)).done(function(person) {
        $.when(API.stringData(), API.achievementData(), API.biomes(), API.items(), API.people(), API.mobData()).done(function(stringData, achievementData, biomes, items, people, mobData) {
            document.title = person.interfaceName + ' on Wurstmineberg';
            loadStatData(person, stringData, achievementData, biomes, items, mobData);
            displayUserData(person);
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
