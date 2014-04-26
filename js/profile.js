function get_user_name() {
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

function initialize_datatables() {
    /* Set the defaults for DataTables initialisation */
    var table = $('#stats-blocks-table').dataTable({
        "bPaginate": false,
        "bAutoWidth": false,
        "bLengthChange": false,
        "bFilter": false,
        "sDom": "<'row-fluid'<'span6'f><'span6'<'pull-right'T>>r>t",
    });
    new FixedHeader(table)
}

function display_user_data(person) {
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
        var description = 'You can update your description using the command <code>!<a href="//wiki.wurstmineberg.de/Commands#People">People</a> ' + person.id + ' description &lt;value&gt;...</code>.';
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

function initialize_inventory(tbody, rows, cols) {
    for (var row = 0; row < rows; row++) {
        tbody.append('<tr class="inv-row inv-row-' + row + '"></tr>');
    }
    for (var col = 0; col < cols; col++) {
        tbody.children('tr.inv-row').append('<td class="inv-cell inv-cell-' + col + '"><div class="inv-cell-style"><div></div></div></td>');
    }
}

function display_slot(cell, stack, items, string_data) {
    var item = items.itemByDamage(stack.id, stack.Damage);
    cell.children('div').children('div').append(item.htmlImage());
    var name = item.name || stack['id'].toString();
    if ('tag' in stack) {
        if ('display' in stack['tag'] && 'Name' in stack['tag']['display']) {
            name += ' “' + stack['tag']['display']['Name'] + '”';
        } else if ('title' in stack['tag']) {
            name += ' “' + stack['tag']['title'] + '”';
            if ("author" in stack['tag']) {
                name += ' by ' + stack['tag']['author'];
            }
        }
        var enchantments = [];
        if ('ench' in stack['tag']) {
            enchantments = stack['tag']['ench'];
        } else if ('StoredEnchantments' in stack['tag']) {
            enchantments = stack['tag']['StoredEnchantments'];
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
                name += string_data['enchantments']['names'][ench['id'].toString()] + ' ' + string_data['enchantments']['levels'][ench['lvl'].toString()];
            });
            name += ')';
        }
    }
    cell.children('div').attr('title', name);
    cell.children('div').tooltip();
    if ('Count' in stack && stack['Count'] > 1) {
        cell.children('div').append('<span class="count">' + stack['Count'] + '</span>');
    }
}

function display_inventory(player_data, items, string_data) {
    $('tr.loading').remove();
    $('.inventory-opt-out').removeClass('inventory-opt-out').addClass('inventory-opt-in');
    initialize_inventory($('#main-inventory > tbody'), 3, 9);
    initialize_inventory($('#hotbar-table > tbody'), 1, 9);
    initialize_inventory($('#ender-chest-table > tbody'), 3, 9);
    player_data['Inventory'].forEach(function(stack) {
        if ('Slot' in stack) {
            var cell = undefined;
            if (stack['Slot'] >= 0 && stack['Slot'] < 9) {
                cell = $('#hotbar-table .inv-row-0 .inv-cell-' + stack['Slot']);
            } else if (stack['Slot'] >= 9 && stack['Slot'] < 36) {
                cell = $('#main-inventory .inv-row-' + (Math.floor(stack['Slot'] / 9) - 1) + ' .inv-cell-' + (stack['Slot'] % 9));
            }
            if (cell !== undefined) {
                display_slot(cell, stack, items, string_data);
            }
        }
    });
    player_data['EnderItems'].forEach(function(stack) {
        if ('Slot' in stack && stack['Slot'] >= 0 && stack['Slot'] < 27) {
            var cell = $('#ender-chest-table .inv-row-' + Math.floor(stack['Slot'] / 9) + ' .inv-cell-' + (stack['Slot'] % 9));
            display_slot(cell, stack, items, string_data);
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
                return 'new member (may still be <a href="http://wiki.wurstmineberg.de/Server_invitations#Hard_requirements">vetoed</a>)';
            }
            return 'later member (post-<a href="http://wiki.wurstmineberg.de/Server_invitations#History">freeze</a>)';
        }
        var statuses = {
            'former': 'former member (unwhitelisted for inactivity)',
            'founding': 'founding member',
            'invited': 'invited but not whitelisted yet',
            'later': 'later member (pre-<a href="http://wiki.wurstmineberg.de/Server_invitations#History">freeze</a>)',
            'vetoed': 'former member (unwhitelisted by <a href="http://wiki.wurstmineberg.de/Server_invitations#Hard_requirements">veto</a>)'
        };
        return status in statuses ? statuses[status] : status;
    }
    $('#profile-stat-row-status').children('.value').html(statusDisplay(person.status || 'later'));
}

function display_stat_data(stat_data, string_data, item_data, achievement_data, biomes) {
    var loading_stat_general = $('#loading-stat-general-table');
    var loading_stat_item = $('#loading-stat-items-table');
    var loading_stat_block = $('#loading-stat-blocks-table');
    var loading_stat_general = $('#loading-stat-general-table');
    var loading_stat_mobs = $('#loading-stat-mobs-table');
    var loading_stat_achievements = $('#loading-stat-achievements-table');

    var general = [];
    var items = [];
    var blocks = [];
    var mobs = [];
    var achievements = [];
    
    $.each(stat_data, function(key, value) {
        stat = key.split('.');
        var name;

        if (stat[0] === 'stat') {
            if (stat[1] === 'craftItem' || stat[1] === 'useItem' || stat[1] === 'breakItem' || stat[1] === 'mineBlock') {
                var item = item_data.itemById(stat.slice(2).join(':'));
                var name = item.name || stat.slice(2).join(':');
                var actionIndex = stat[1];
                var count = value;
                
                var collection;
                if (item.isBlock) {
                    collection = blocks;
                } else {
                    collection = items;
                }
                
                var found = false;
                if (item.id) {
                    collection.forEach(function(value) {
                        if (value['id'] === item.id) {
                            value[actionIndex] = count;
                            found = true;
                            return;
                        }
                    });
                }
                
                if (!found) {
                    newEntry = {
                        'name': name,
                        'numericID': item.numericID,
                        'id': item.id
                    };
                    newEntry[actionIndex] = count;
                    if (item) {
                        newEntry['info'] = item;
                    };
                    collection.push(newEntry);
                }
            } else if (stat[1] === 'killEntity' ||
                       stat[1] === 'entityKilledBy') {
                var id = stat[2];
                var actionIndex = stat[1];
                var count = value;

                var name = id;
                if ('stats' in string_data) {
                    if ('mobs' in string_data['stats']) {
                        if (stat[2] in string_data['stats']['mobs']) {
                            name = string_data['stats']['mobs'][stat[2]];
                        };
                    };
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
                    newEntry = {'id': id, 'name': name};
                    newEntry[actionIndex] = count;
                    mobs.push(newEntry);
                };

            } else {
                var final_key = key;
                var final_value = prettify_stats_value(stat[1], value);

                if ('stats' in string_data) {
                    if ('general' in string_data['stats']) {
                        if (stat[1] in string_data['stats']['general']) {
                            final_key = string_data['stats']['general'][stat[1]];
                        };
                    };
                };

                general.push({'name': final_key, 'value': final_value});
            }
        } else if (stat[0] === 'achievement') {
            var id = stat[1];
            var final_value = value;
            if (id === 'exploreAllBiomes' && 'value' in value) {
                if (value['value'] > 0) {
                    final_value = 'Yes';
                } else {
                    var visitedBiomes = value['progress'].slice(0);
                    final_value = '<span class="achievement-list">';
                    adventuring_biomes = _.filter(biomes.biomes, function(biome) {
                        return biome.adventuringTime;
                    });
                    _.map(adventuring_biomes, function(biome) {
                        final_value += '<span class="glyphicon-text-aligned achievement-value">';
                        if (_.find(visitedBiomes, function(biome_name) {
                            return biome_name === biome.id;
                        })) {
                            final_value += '<span class="glyphicon glyphicon-ok text-success"></span> ';
                        } else {
                            final_value += '<span class="glyphicon glyphicon-remove text-danger"></span> ';
                        };
                        final_value += '<abbr class="nounderline achievement-name" title="' + biome.description + '">' + biome.name + '</abbr></span> ';
                    });
                    final_value += '</span>';
                }
            } else {
                if (parseInt(value) >= 1) {
                    final_value = 'Yes';
                } else {
                    final_value = 'No';
                }
            }
            achievements.push({
                'achievement': new Achievement(achievement_data, id),
                'value': final_value
            });
        }
    });
    // Add the missing achievements
    _.keys(achievement_data).forEach(function(id) {
        var alreadyExisting = _.some(_.values(achievements), function(achievement) {
            return (id === achievement.achievement.id);
        });
        if (!alreadyExisting) {
            achievements.push({
                'achievement': new Achievement(achievement_data, id),
                'value': 'No'
            });
        };
    });
    
    general.sort(function(a, b) {
        nameA = a['name'];
        nameB = b['name'];
        return nameA.localeCompare(nameB);
    });
    
    mobs.sort(function(a, b) {
        nameA = a['name'];
        nameB = b['name'];
        return nameA.localeCompare(nameB);
    });
    
    items.sort(function(a, b) {
        return a.numericID - b.numericID;
    });
    
    blocks.sort(function(a, b) {
        return a.numericID - b.numericID;
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
        name = dict['name'];
        value = dict['value'];
        var row = '<tr id="general-row-' + name + '" class="general-row"><td class="name">' + name + '</td><td class="info">' + value + '</td></tr>'
        loading_stat_general.before(row);
    });
    
    $.each(mobs, function(index, dict) {
        name = dict['name'];
        id = dict['id']
        
        row = '<tr id="mob-row-' + id + '" class="mob-row"><td class="name"></td><td class="killed">0</td><td class="killed-by">0</td></tr>';
        loading_stat_mobs.before(row);
        row = $('#mob-row-' + id);
        row.children('.name').text(name);
        
        if ('killEntity' in dict) {
            row.children('.killed').text(dict['killEntity']);
        }
        
        if ('entityKilledBy' in dict) {
            row.children('.killed-by').text(dict['entityKilledBy']);
        }
    });
    $.each(items, function(index, dict) {
        var name = dict['name'];
        var id = dict['numericID'];
        var image = "";
        if ('info' in dict) {
            var info = dict['info'];
            image = info.htmlImage('item-image');
        }
        var row = '<tr id="item-row-' + id + '" class="item-row"><td class="image"></td><td class="name"></td><td class="depleted">0</td><td class="crafted">0</td><td class="used">0</td></tr>';
        loading_stat_item.before(row);
        row = $('#item-row-' + id);
        row.children('.name').text(name);
        row.children('.image').html(image);
        
        if ('craftItem' in dict) {
            row.children('.crafted').text(dict['craftItem']);
        }
        
        if ('useItem' in dict) {
            row.children('.used').text(dict['useItem']);
        }
        
        if ('breakItem' in dict) {
            row.children('.depleted').text(dict['breakItem']);
        }
    });
    
    $.each(blocks, function(index, dict) {
        var name = dict['name'];
        var id = dict['numericID'];
        var image = "";
        if ('info' in dict) {
            var info = dict['info'];
            image = info.htmlImage('item-image');
        }
        
        var row = '<tr id="block-row-' + id + '" class="block-row"><td class="image"></td><td class="name"></td><td class="crafted">0</td><td class="used">0</td><td class="mined">0</td></tr>';
        loading_stat_block.before(row);
        row = $('#block-row-' + id);
        row.children('.name').text(name);
        row.children('.image').html(image);
        
        if ('craftItem' in dict) {
            row.children('.crafted').text(dict['craftItem']);
        }
        
        if ('useItem' in dict) {
            row.children('.used').text(dict['useItem']);
        }
        
        if ('mineBlock' in dict) {
            row.children('.mined').text(dict['mineBlock']);
        }
    });
    
    $.each(achievements, function(index, dict) {
        value = dict['value'];
        if (value === "Yes") {
            value = '<span class="glyphicon glyphicon-ok text-success"></span>'
        } else if (value === "No") {
            value = '<span class="glyphicon glyphicon-remove text-danger"></span>'
        }
        row = '<tr id="achievement-row-' + dict.achievement.id + '" class="achievement-row"><td>' + dict.achievement.item(item_data).htmlImage(dict.achievement.fancy ? 'achievement-image fancy' : 'achievement-image') + '</td><td class="name"><a href="#" data-toggle="tooltip" data-placement="right" rel="tooltip" class="text-link" title="' + dict.achievement.description + '">' + dict.achievement.displayName + '</a></td><td class="value">' + value + '</td></tr>';
        loading_stat_achievements.before(row);
    });
    
    $('.loading-stat').remove();
    initialize_tooltips();
    //initialize_datatables();
}

function load_stat_data(person, string_data, achievement_data, biomes, items) {
    if (person.option('show_inventory')) {
        $.when(API.playerData(person)).done(function(player_data) {
            display_inventory(player_data, items, string_data);
        }).fail(function() {
            $('.inventory-table .loading td').html('Error: Could not load ' + person.minecraft + '.dat');
        });
    } else if (person.option_is_default('show_inventory')) {
        $('.panel').before('<div class="alert alert-info"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><strong>Want to show you inventory?</strong> Since you have not set a preference for this, your inventory and Ender chest will be displayed on this page once we get everything working. You can activate this feature now using the command <code>!<a href="//wiki.wurstmineberg.de/Commands#Option">Option</a> show_inventory on</code>, or permanently deactivate it with <code>!<a href="//wiki.wurstmineberg.de/Commands#Option">Option</a> show_inventory off</code>.</div>');
    }
    $.when(API.personStatData(person)).done(function(stat_data) {
        display_stat_data(stat_data, string_data, items, achievement_data, biomes);
    }).fail(function() {
        $('.loading-stat').html('<td colspan="7">Error: Could not load ' + person.minecraft + '.json</td>');
    });
}

function load_user_data() {
    var username = get_user_name();
    document.title = username + ' on Wurstmineberg';
    $.when(API.personById(username), API.stringData(), API.achievementData(), API.biomes(), API.items(), API.people()).done(function(person, string_data, achievement_data, biomes, items, people) {
        document.title = person.interfaceName + ' on Wurstmineberg';
        load_stat_data(person, string_data, achievement_data, biomes, items);
        display_user_data(person);
        $.when(API.personStatData(person)).done(function(statData) {
            displayProfileData(person, items, people, statData);
        }).fail(function() {
            displayProfileData(person, items, people, {});
        });
    }).fail(function() {
        $('.loading').html('Error: User with this name not found');
    });
}


select_tab_with_id("tab-stats-profile");
bind_tab_events();
load_user_data();
