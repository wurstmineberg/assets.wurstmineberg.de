function display_leaderboard_stat_data(stat_data, string_data, people) {
    var stats = [];
    var loading_leaderboards = $('#loading-stat-leaderboard-table');

    $.each(stat_data, function(minecraftname, playerstats) {
        player = people.personByMinecraft(minecraftname);
        if (player == undefined) {
            return;
        }
        $.each(playerstats, function(key, value) {
            stat = key.split('.');
            var override = false;
            var add_name = false;
            var found = false;
            var matched_index;
            var stat_to_override;

            var name = stat[1];
            if ('stats' in string_data) {
                if ('general' in string_data['stats']) {
                    if (stat[1] in string_data['stats']['general']) {
                        name = string_data['stats']['general'][stat[1]];
                    };
                };
            }
            
            $.each(stats, function(index, playerstat) {
                if (playerstat['id'] === key) {
                    found = true;
                    if (value > playerstat['value']) {
                        stats[index]['secondplayers'] = stats[index]['players'];
                        stats[index]['secondvalue'] = stats[index]['value'];
                        stats[index]['players'] = [player];
                        stats[index]['value'] = value;
                    } else if (value == playerstat['value']) {
                        stats[index]['players'].push(player);
                    } else if (value > playerstat['secondvalue']) {
                        stats[index]['secondplayers'] = [player];
                        stats[index]['secondvalue'] = value;
                    } else if (value == playerstat['secondvalue']) {
                        stats[index]['secondplayers'].push(player);
                    }
                    if (value < playerstat['minvalue']) {
                        stats[index]['minplayers'] = [player];
                        stats[index]['minvalue'] = value;
                    } else if (value == playerstat['minvalue']) {
                        stats[index]['minplayers'].push(player);
                    }
                    if (found) {
                        return;
                    }
                }
            });
            
            if (!found) {
                stats.push({
                    'id': key,
                    'name': name,
                    'players': [player],
                    'value': value,
                    'secondplayers': [],
                    'secondvalue': 0,
                    'minplayers': [player],
                    'minvalue': value
                });
            };
        });
    });
    
    stats.sort(function(a, b) {
        nameA = a['name'];
        nameB = b['name'];
        return nameA.localeCompare(nameB);
    });
    
    $.each(stats, function(index, data) {
        var key = data['id']
        var stat = key.split('.');
        var name = data['name'];

        var players = data['players'];
        var playerhtml = html_player_list(people.sorted(players));
        var secondplayers = data['secondplayers'];
        var secondplayerhtml = html_player_list(people.sorted(secondplayers));
        var minplayers = data['minplayers'];
        var minplayerhtml = html_player_list(people.sorted(minplayers));
        var value = prettify_stats_value(stat[1], data['value']);
        var secondvalue = prettify_stats_value(stat[1], data['secondvalue']);
        var minvalue = prettify_stats_value(stat[1], data['minvalue']);
        
        $row = $('<tr>', {'class': 'leaderboard-row'}).html($('<td>', {'class': 'stat'}).html('<a href="//i.wurstmineberg.de/wurstminestats/statspage/' + stat[1] + '.png">' + name + '</a>'));
        $row.append($('<td>', {'class': 'leading-player'}).html(playerhtml));
        $row.append($('<td>', {'class': 'value'}).html(value));
        $row.append($('<td>', {'class': 'second-player'}).html(secondplayerhtml));
        $row.append($('<td>', {'class': 'secondvalue'}).html(secondvalue));
        loading_leaderboards.before($row);
    });

    $('#loading-stat-leaderboard-table').remove();
}

function prepare_achievements(achievement_data, item_data) {
    var missing_main_track = {};
    $.each(achievement_data, function(achievement_id, achievement_info) {
        if (achievement_info['track'] == 'main') {
            missing_main_track[achievement_id] = achievement_info;
        }
    });
    var main_track = [];
    while (Object.keys(missing_main_track).length) {
        $.each(missing_main_track, function(achievement_id, achievement_info) {
            var fancy = false;
            if ('fancy' in achievement_info) {
                fancy = achievement_info['fancy'];
            }
            var achievement_image = '/assets/img/grid/' + item_data[achievement_info['icon'].toString()]['image'];
            var achievement_html = '<tr id="achievement-row-' + achievement_id + '"><td><img class="achievement-image' + (fancy ? ' fancy' : '') + '" src="' + achievement_image + '" /></td><td>' + achievement_info['displayname'] + '</td><td class="achievement-players">&nbsp;</td>';
            if (achievement_info['requires'] == null) {
                main_track.push(achievement_id);
                $('#achievement-row-none').after(achievement_html);
                delete missing_main_track[achievement_id];
            } else if ($('#achievement-row-' + achievement_info['requires']).length) {
                main_track.push(achievement_id);
                $('#achievement-row-' + achievement_info['requires']).after(achievement_html);
                delete missing_main_track[achievement_id];
            }
        });
    }
    $('#achievement-row-loading').remove();
    return main_track;
}

function display_achievements_stat_data(achievement_data, achievement_stat_data, people, main_track) {
    var no_track_achievements = [];
    var main_track_players = {
        none: [],
        noadventuringtime: [],
        all: []
    };
    $.each(achievement_data, function(achievement_id, achievement_info) {
        if (!('track' in achievement_info)) {
            no_track_achievements.push(achievement_id);
        } else if (achievement_info['track'] == 'main') {
            main_track_players[achievement_id] = [];
        }
    });
    $.each(achievement_stat_data, function(minecraft_nick, achievement_stats) {
        var taken_main_track = [];
        var missing_no_track = no_track_achievements.slice(0);
        var has_adventuring_time = false;
        $.each(achievement_stats, function(full_achievement_id, value) {
            var achievement_id = full_achievement_id.split('.')[1];
            if ('track' in achievement_data[achievement_id]) {
                if (achievement_data[achievement_id]['track'] == 'main') {
                    if (value > 0) {
                        taken_main_track.push(achievement_id);
                    }
                } else if (achievement_data[achievement_id]['track'] == 'biome') {
                    if (value['value'] > 0) {
                        has_adventuring_time = true;
                    }
                }
            } else {
                if (value > 0) {
                    missing_no_track.splice(missing_no_track.indexOf(achievement_id), 1);
                }
            }
        });
        var main_track_progress = 'none';
        // move player down
        main_track.forEach(function(achievement_id) {
            if (taken_main_track.indexOf(achievement_id) > -1) {
                main_track_progress = achievement_id;
            }
        });
        if (main_track_progress == main_track.slice(-1)[0] && missing_no_track.length == 0) {
            if (has_adventuring_time) {
                main_track_progress = 'all';
            } else {
                main_track_progress = 'noadventuringtime';
            }
        }
        var person = people.personByMinecraft(minecraft_nick);
        if (person == undefined) {
            return;
        }
        main_track_players[main_track_progress].push(person);
    });
    $.each(main_track_players, function(achievement_id, people_list) {
        $('#achievement-row-' + achievement_id).children('.achievement-players').html(html_player_list(people.sorted(people_list)));
    });
}

function display_biomes_stat_data(achievement_stat_data, biome_data, people) {
    var adventuringTimeBiomes = [];
    $.each(biome_data['biomes'], function(biomeNumberString, biomeInfo) {
        if ('adventuringTime' in biomeInfo && biomeInfo['adventuringTime'] == false) {
            return;
        }
        adventuringTimeBiomes.push(biomeInfo['id']);
    });
    var biomeStats = {};
    $.each(achievement_stat_data, function(minecraft_nick, achievement_stats) {
        var numBiomes = 0;
        if ('achievement.exploreAllBiomes' in achievement_stats) {
            if ('value' in achievement_stats['achievement.exploreAllBiomes'] && achievement_stats['achievement.exploreAllBiomes']['value'] > 0) {
                numBiomes = achievement_stats['achievement.exploreAllBiomes']['progress'].length;
            } else if ('progress' in achievement_stats['achievement.exploreAllBiomes']) {
                achievement_stats['achievement.exploreAllBiomes']['progress'].forEach(function(biome_id) {
                    if ($.inArray(biome_id, adventuringTimeBiomes) != -1) {
                        numBiomes++;
                    }
                });
            }
        }
        if (!(numBiomes.toString() in biomeStats)) {
            biomeStats[numBiomes.toString()] = [];
        }
        var person = people.personByMinecraft(minecraft_nick);
        if (person == undefined) {
            return;
        }
        biomeStats[numBiomes.toString()].push(person);
    });
    //TODO sort by number of biomes
    $.each(biomeStats, function(numBiomes, people_list) {
        $tr = $('<tr>').html($('<td>').html(numBiomes));
        $tr.append($('<td>').html(html_player_list(people.sorted(people_list))));
        $('#stats-achievements-table-biome-track tbody tr:last').after($tr);
    });
    $('#loading-achievements-table-biome-track').remove();
}

function display_deathgames_log(death_games_log, people) {
    death_games_log['log'].forEach(function(logEntry) {
        $tr = $('<tr>').html('<td>' + logEntry['date'] + '</td>');
        $tr.append($('<td>').html(html_player_list([people.personById(logEntry['attacker'])])));
        $tr.append($('<td>').html(html_player_list([people.personById(logEntry['target'])])));
        $tr.append($('<td>').html(logEntry['success'] ? '<span class="glyphicon glyphicon-ok text-success"></span>' : '<span class="glyphicon glyphicon-remove text-danger"></span>'));
        $('#loading-deathgames-log').after($tr);
    });
    $('#loading-deathgames-log').remove();
}

function display_deathgames_stat_data(death_games_log, people) {
    var log = death_games_log['log'];
    var participating = people.activePeople();
    if ('participating' in death_games_log) {
        participating = people.sorted(death_games_log['participating']);
    }
    var stats = {
        'kills': function(person) {
            return log.filter(function(logEntry) {
                if (logEntry['success']) {
                    return (logEntry['attacker'] == person.id);
                } else {
                    return (logEntry['target'] == person.id);
                }
            }).length;
        },
        'deaths': function(person) {
            return log.filter(function(logEntry) {
                if (logEntry['success']) {
                    return (logEntry['target'] == person.id);
                } else {
                    return (logEntry['attacker'] == person.id);
                }
            }).length;
        },
        'diamonds': function(person) {
            ret = 0;
            log.forEach(function(logEntry) {
                if (logEntry['attacker'] == person.id) {
                    if (logEntry['success']) {
                        ret++;
                    } else {
                        ret--;
                    }
                } else if (logEntry['target'] == person.id) {
                    if (logEntry['success']) {
                        ret--;
                    } else {
                        ret++;
                    }
                }
            });
            return ret;
        },
        'attacks': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['attacker'] == person.id);
            }).length;
        },
        'attacks-success': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['attacker'] == person.id && logEntry['success']);
            }).length;
        },
        'attacks-fail': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['attacker'] == person.id && !logEntry['success']);
            }).length;
        },
        'defense': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['target'] == person.id);
            }).length;
        },
        'defense-success': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['target'] == person.id && !logEntry['success']);
            }).length;
        },
        'defense-fail': function(person) {
            return log.filter(function(logEntry) {
                return (logEntry['target'] == person.id && logEntry['success']);
            }).length;
        }
    }
    $.each(stats, function(statName, statFunction) {
        var bestValue = null;
        var bestPlayers = [];
        var secondValue = null;
        var secondPlayers = [];
        participating.forEach(function(person) {
            var statForPerson = statFunction(person);
            if (bestValue === null || statForPerson > bestValue) {
                secondValue = bestValue;
                secondPlayers = bestPlayers;
                bestValue = statForPerson;
                bestPlayers = [person];
            } else if (statForPerson == bestValue) {
                bestPlayers.push(person);
            } else if (secondValue === null || statForPerson > secondValue) {
                secondValue = statForPerson;
                secondPlayers = [person];
            } else if (statForPerson == secondValue) {
                secondPlayers.push(person);
            }
        });
        var statRow = $('#deathgames-stat-row-' + statName);
        statRow.children('.leading-player').html(html_player_list(bestPlayers));
        if (bestValue === null) {
            statRow.children('.value').html('');
        } else {
            statRow.children('.value').html(bestValue);
        }
        statRow.children('.second-player').html(html_player_list(secondPlayers));
        if (secondValue === null) {
            statRow.children('.secondvalue').html('');
        } else {
            statRow.children('.secondvalue').html(secondValue);
        }
    });
}

function load_leaderboard_stat_data() {
    $.when(API.statData(), API.stringData(), API.people()).done(function(stat_data, string_data, people) {
        display_leaderboard_stat_data(stat_data, string_data, people)
    })
    .fail(function() {
        $('#loading-stat-leaderboard-table').html('<td colspan="7">Error: Could not load api.wurstmineberg.de/server/playerstats/general.json</td>');
    });
}

function load_achievements_stat_data() {
    $.when(API.biomes(), API.itemData(), API.achievementData(), API.achievementStatData(), API.people()).done(function(biome_data, item_data, achievement_data, achievement_stat_data, people) {
        var main_track = prepare_achievements(achievement_data, item_data);
        display_achievements_stat_data(achievement_data, achievement_stat_data, people, main_track);
        display_biomes_stat_data(achievement_stat_data, biome_data, people);
    }).fail(function() {
        $('#achievement-row-loading').html('<td colspan="3">Error: Could not load achievements</td>');
        $('#loading-achievements-table-biome-track').html('<td colspan="3">Error: Could not load biomes</td>');
    });
}

function load_deathgames_stat_data() {
    $.when(API.deathGamesLog(), API.people()).done(function(death_games_log, people) {
        display_deathgames_log(death_games_log, people);
        display_deathgames_stat_data(death_games_log, people);
    }).fail(function() {
        $('#loading-deathgames-log').html('<td colspan="4">Error: Could not load Death Games log</td>');
    });
}

select_tab_with_id("tab-stats-leaderboard");
bind_tab_events();
load_leaderboard_stat_data();
load_achievements_stat_data();
load_deathgames_stat_data();
