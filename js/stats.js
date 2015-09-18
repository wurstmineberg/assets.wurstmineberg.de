function displayLeaderboardStatData(statData, stringData, people) {
    $.when(people.mapObject(statData)).done(function(statData) {
        var stats = [];
        var loadingLeaderboards = $('#loading-stat-leaderboard-table');

        statData.forEach(function(playerStatsPair) {
            var player = playerStatsPair.player;
            var playerStats = playerStatsPair.value;
            if (player == undefined) {
                return;
            }
            $.each(playerStats, function(key, value) {
                stat = key.split('.');
                var override = false;
                var addName = false;
                var found = false;
                var matchedIndex;
                var statToOverride;

                var name = stat[1];
                if ('stats' in stringData) {
                    if ('general' in stringData.stats) {
                        if (stat[1] in stringData.stats.general) {
                            name = stringData.stats.general[stat[1]];
                        };
                    };
                }

                $.each(stats, function(index, playerStat) {
                    if (found) {
                        return;
                    }
                    if (playerStat.id === key) {
                        found = true;
                        if (value > playerStat.value) {
                            stats[index].secondPlayers = stats[index].players;
                            stats[index].secondValue = stats[index].value;
                            stats[index].players = [player];
                            stats[index].value = value;
                        } else if (value == playerStat.value) {
                            stats[index].players.push(player);
                        } else if (value > playerStat.secondValue) {
                            stats[index].secondPlayers = [player];
                            stats[index].secondValue = value;
                        } else if (value == playerStat.secondValue) {
                            stats[index].secondPlayers.push(player);
                        }
                        if (value < playerStat.minValue) {
                            stats[index].minPlayers = [player];
                            stats[index].minValue = value;
                        } else if (value == playerStat.minValue) {
                            stats[index].minPlayers.push(player);
                        }
                    }
                });

                if (!found) {
                    stats.push({
                        id: key,
                        name: name,
                        players: [player],
                        value: value,
                        secondPlayers: [],
                        secondValue: 0,
                        minPlayers: [player],
                        minValue: value
                    });
                };
            });
        });

        stats.sort(function(a, b) {
            nameA = a.name;
            nameB = b.name;
            return nameA.localeCompare(nameB);
        });

        $.each(stats, function(index, data) {
            var key = data.id;
            var stat = key.split('.');
            var name = data.name;

            var players = data.players;
            var playerHTML = html_player_list(people.sorted(players));
            var secondPlayers = data.secondPlayers;
            var secondPlayerHTML = secondPlayers.length ? html_player_list(people.sorted(secondPlayers)) : $('<span>', {class: 'muted'}).text('everyone else');
            var minPlayers = data.minPlayers;
            var minPlayerHTML = html_player_list(people.sorted(minPlayers));
            var value = prettifyStatsValue(stat[1], data.value);
            var secondValue = prettifyStatsValue(stat[1], data.secondValue);
            if (data.secondPlayers.length == 0) {
                secondValue = $('<span>', {class: 'muted'}).text(secondValue);
            }
            var minValue = prettifyStatsValue(stat[1], data.minValue);

            $row = $('<tr>', {class: 'leaderboard-row'}).html($('<td>', {'class': 'stat'}).html('<a href="//images.' + host + '/wurstminestats/statspage/' + stat[1] + '.png">' + name + '</a>'));
            $row.append($('<td>', {class: 'leading-player'}).html(playerHTML));
            $row.append($('<td>', {class: 'value'}).html(value));
            $row.append($('<td>', {class: 'second-player'}).html(secondPlayerHTML));
            $row.append($('<td>', {class: 'secondvalue'}).html(secondValue));
            loadingLeaderboards.before($row);
        });

        $('#loading-stat-leaderboard-table').remove();
    });
}

function displayMobsStatData(people, entityStats, mobData) {
    $.when(people.mapObject(entityStats)).done(function(statData) {
        var byMob = {};
        statData.forEach(function(playerStatsPair) {
            var person = playerStatsPair.player;
            var playerStats = playerStatsPair.value;
            if (person == undefined) {
                return;
            }
            if ('entityKilledBy' in playerStats) {
                $.each(playerStats.entityKilledBy, function(mob, deaths) {
                    if (mob in byMob) {
                        if ('kills' in byMob[mob]) {
                            if (deaths > byMob[mob].kills) {
                                byMob[mob].kills = deaths;
                                byMob[mob].mostKilledPlayers = [person];
                            } else if (deaths == byMob[mob].kills) {
                                byMob[mob].mostKilledPlayers.push(person);
                            }
                        } else {
                            byMob[mob].kills = deaths;
                            byMob[mob].mostKilledPlayers = [person];
                        }
                    } else {
                        byMob[mob] = {
                            kills: deaths,
                            mostKilledPlayers: [person]
                        };
                    }
                });
            }
            if ('killEntity' in playerStats) {
                $.each(playerStats.killEntity, function(mob, kills) {
                    if (mob in byMob) {
                        if ('deaths' in byMob[mob]) {
                            if (kills > byMob[mob].deaths) {
                                byMob[mob].deaths = kills;
                                byMob[mob].mostKilledBy = [person];
                            } else if (kills == byMob[mob].deaths) {
                                byMob[mob].mostKilledBy.push(person);
                            }
                        } else {
                            byMob[mob].deaths = kills;
                            byMob[mob].mostKilledBy = [person];
                        }
                    } else {
                        byMob[mob] = {
                            deaths: kills,
                            mostKilledBy: [person]
                        }
                    }
                });
            }
        });
        byMob = _.map(_.pairs(byMob), function(mobPair) {
            var ret = mobPair[1];
            ret.mob = mobPair[0];
            if ('mobs' in mobData && mobPair[0] in mobData.mobs && 'name' in mobData.mobs[mobPair[0]]) {
                ret.mob = mobData.mobs[mobPair[0]].name;
            };
            return ret;
        });
        byMob.sort(function(a, b) {
            return a.mob.localeCompare(b.mob);
        });
        byMob.forEach(function(data) {
            var $row = $('<tr>').html($('<td>').text(data.mob));
            if ('mostKilledPlayers' in data && data.mostKilledPlayers.length) {
                $row.append($('<td>').html(html_player_list(people.sorted(data.mostKilledPlayers))));
                $row.append($('<td>').text(data.kills));
            } else {
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('no one')));
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('0')));
            }
            if ('mostKilledBy' in data && data.mostKilledBy.length) {
                $row.append($('<td>').html(html_player_list(people.sorted(data.mostKilledBy))));
                $row.append($('<td>').text(data.deaths));
            } else {
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('no one')));
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('0')));
            }
            $('#loading-mobs-bymob').before($row);
        });
        $('#loading-mobs-bymob').remove();
    });
}

function prepareAchievements(achievementData, items) {
    Achievement.track(achievementData, 'main').forEach(function(achievement) {
        var achievement_html = '<tr id="achievement-row-' + achievement.id + '"><td>' + achievement.image(items) + '</td><td>' + achievement.displayName + '</td><td class="achievement-players">&nbsp;</td>';
        $('#achievement-row-noadventuringtime').before(achievement_html);
    });
    $('#achievement-row-loading').remove();
}

function display_achievements_stat_data(achievementData, achievementStatData, people) {
    var mainTrack = Achievement.track(achievementData, 'main');
    var noTrack = Achievement.track(achievementData, null);
    var mainTrackPlayers = {
        none: [],
        noadventuringtime: [],
        all: []
    };
    mainTrack.forEach(function(achievement) {
        mainTrackPlayers[achievement.id] = [];
    });
    $.each(achievementStatData, function(minecraft_nick, achievement_stats) {
        var taken_main_track = [];
        var missing_no_track = noTrack.slice(0); // copy of noTrack
        var has_adventuring_time = false;
        $.each(achievement_stats, function(full_achievement_id, value) {
            var achievement_id = full_achievement_id.split('.')[1];
            var achievement = new Achievement(achievementData, achievement_id);
            if (achievement.track == 'main') {
                if (value > 0) {
                    taken_main_track.push(achievement_id);
                }
            } else if (achievement.track == 'biome') {
                if (value['value'] > 0) {
                    has_adventuring_time = true;
                }
            } else {
                if (value > 0) {
                    missing_no_track.splice(missing_no_track.indexOf(achievement_id), 1);
                }
            }
        });
        var main_track_progress = 'none';
        // move player down
        mainTrack.forEach(function(achievement) {
            if (taken_main_track.indexOf(achievement.id) > -1) {
                main_track_progress = achievement.id;
            }
        });
        if (main_track_progress == mainTrack.slice(-1)[0].id && missing_no_track.length == 0) {
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
        mainTrackPlayers[main_track_progress].push(person);
    });
    $.each(mainTrackPlayers, function(achievement_id, people_list) {
        $('#achievement-row-' + achievement_id).children('.achievement-players').html(html_player_list(people.sorted(people_list)));
    });
}

function displayBiomesStatData(achievement_stat_data, biome_data, people) {
    var adventuringTimeBiomes = [];
    $.each(biome_data['biomes'], function(biomeNumberString, biomeInfo) {
        if ('adventuringTime' in biomeInfo && biomeInfo['adventuringTime'] == false) {
            return;
        }
        adventuringTimeBiomes.push(biomeInfo['id']);
    });
    var biomeStats = {};
    biomeStats[adventuringTimeBiomes.length.toString()] = [];
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
    $.each(biomeStats, function(numBiomes, people_list) {
        $tr = $('<tr>').html($('<td>').html(numBiomes));
        $tr.append($('<td>').html(html_player_list(people.sorted(people_list))));
        if (people_list.length || numBiomes == adventuringTimeBiomes.length) {
            $('#stats-achievements-table-biome-track tbody tr:last').after(people_list.length ? $tr : $('<tr>').html($('<td>', {'class': 'muted', 'colspan': '2'}).text(numBiomes + ' biomes required for Adventuring Time')));
        };
    });
    $('#loading-achievements-table-biome-track').remove();
}

function displayDeathGamesLog(deathGamesLog, people) {
    deathGamesLog.log.forEach(function(logEntry) {
        $.when(people.personById(logEntry.attacker), people.personById(logEntry.target)).done(function(attacker, target) {
            $tr = $('<tr>').html('<td>' + logEntry.date + '</td>');
            $tr.append($('<td>').html(html_player_list([attacker])));
            $tr.append($('<td>').html(html_player_list([target])));
            $tr.append($('<td>').html(logEntry.success ? '<span class="fa fa-check fa-fw text-success"></span>' : '<span class="fa fa-times fa-fw text-danger"></span>'));
            $('#loading-deathgames-log').after($tr);
        });
    });
    $('#loading-deathgames-log').remove();
}

function displayDeathGamesStatData(deathGamesLog, people) {
    var log = deathGamesLog.log;
    var participating = people.activePeople;
    if ('participating' in deathGamesLog) {
        participating = people.sorted(deathGamesLog.participating);
    }
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

function loadLeaderboardStatData() {
    $.when(API.statData(), API.stringData(), API.people()).done(function(statData, stringData, people) {
        displayLeaderboardStatData(statData, stringData, people)
    })
    .fail(function() {
        $('#loading-stat-leaderboard-table').html('<td colspan="7">Error: Could not load api.' + host + '/server/playerstats/general.json</td>');
    });
}

function loadMobStatData() {
    $.when(API.mainWorld()).done(function(mainWorld) {
        $.when(API.people(), API.ajaxJSONDeferred('http://api.' + host + '/v2/world/' + mainWorld + '/playerstats/entity.json'), API.mobData()).done(function(people, entityStats, mobData) {
            displayMobsStatData(people, entityStats, mobData);
        });
    });
}

function loadAchievementsStatData() {
    $.when(API.biomes(), API.items(), API.achievementData(), API.achievementStatData(), API.people()).done(function(biome_data, items, achievement_data, achievement_stat_data, people) {
        prepareAchievements(achievement_data, items);
        display_achievements_stat_data(achievement_data, achievement_stat_data, people);
        displayBiomesStatData(achievement_stat_data, biome_data, people);
    }).fail(function() {
        $('#achievement-row-loading').html('<td colspan="3">Error: Could not load achievements</td>');
        $('#loading-achievements-table-biome-track').html('<td colspan="3">Error: Could not load biomes</td>');
    });
}

function loadDeathgamesStatData() {
    $.when(API.deathGamesLog(), API.people()).done(function(deathGamesLog, people) {
        displayDeathGamesLog(deathGamesLog, people);
        displayDeathGamesStatData(deathGamesLog, people);
    }).fail(function() {
        $('#loading-deathgames-log').html('<td colspan="4">Error: Could not load Death Games log</td>');
    });
}

selectTabWithID("tab-stats-leaderboard");
bindTabEvents();
loadLeaderboardStatData();
loadMobStatData();
loadAchievementsStatData();
loadDeathgamesStatData();
