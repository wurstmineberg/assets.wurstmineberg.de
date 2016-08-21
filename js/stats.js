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
                var override = false;
                var addName = false;
                var found = false;
                var matchedIndex;
                var statToOverride;

                if ('stats' in stringData) {
                    if ('general' in stringData.stats) {
                        if (key in stringData.stats.general) {
                            name = stringData.stats.general[key];
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
            var stat = data.id;
            var name = data.name;

            var players = data.players;
            var playerHTML = htmlPlayerList(people.sorted(players));
            var secondPlayers = data.secondPlayers;
            var secondPlayerHTML = secondPlayers.length ? htmlPlayerList(people.sorted(secondPlayers)) : $('<span>', {class: 'muted'}).text('everyone else');
            var minPlayers = data.minPlayers;
            var minPlayerHTML = htmlPlayerList(people.sorted(minPlayers));
            var value = prettifyStatsValue(stat, data.value);
            var secondValue = prettifyStatsValue(stat, data.secondValue);
            if (data.secondPlayers.length == 0) {
                secondValue = $('<span>', {class: 'muted'}).text(secondValue);
            }
            var minValue = prettifyStatsValue(stat, data.minValue);

            $row = $('<tr>', {class: 'leaderboard-row'}).html($('<td>', {class: 'stat'}).html('<a href="//images.' + host + '/wurstminestats/statspage/' + stat + '.png">' + name + '</a>'));
            $row.append($('<td>', {class: 'leading-player'}).html(playerHTML));
            $row.append($('<td>', {class: 'value'}).html(value));
            $row.append($('<td>', {class: 'second-player'}).html(secondPlayerHTML));
            $row.append($('<td>', {class: 'secondvalue'}).html(secondValue));
            loadingLeaderboards.before($row);
        });

        loadingLeaderboards.remove();
    }).fail(function() {
        $('#loading-stat-leaderboard-table').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
}

function displayMobsStatData(people, entityStats, entityData) {
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
            var plugin = mobPair[0].split(':')[0];
            ret.mob = mobPair[0].split(':')[1];
            if (plugin in entityData && ret.mob in entityData[plugin] && 'name' in entityData[plugin][ret.mob]) {
                ret.mob = entityData[plugin][ret.mob].name;
            };
            return ret;
        });
        byMob.sort(function(a, b) {
            return a.mob.localeCompare(b.mob);
        });
        byMob.forEach(function(data) {
            var $row = $('<tr>').html($('<td>').text(data.mob));
            if ('mostKilledPlayers' in data && data.mostKilledPlayers.length) {
                $row.append($('<td>').html(htmlPlayerList(people.sorted(data.mostKilledPlayers))));
                $row.append($('<td>').text(data.kills));
            } else {
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('no one')));
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('0')));
            }
            if ('mostKilledBy' in data && data.mostKilledBy.length) {
                $row.append($('<td>').html(htmlPlayerList(people.sorted(data.mostKilledBy))));
                $row.append($('<td>').text(data.deaths));
            } else {
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('no one')));
                $row.append($('<td>').html($('<span>', {class: 'muted'}).text('0')));
            }
            $('#loading-mobs-bymob').before($row);
        });
        $('#loading-mobs-bymob').remove();
    }).fail(function() {
        $('#loading-mobs-bymob').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
}

function prepareAchievements(achievementData, items) {
    Achievement.track(achievementData, 'main').forEach(function(achievement) {
        var achievement_html = '<tr id="achievement-row-' + achievement.id + '"><td>' + achievement.image(items) + '</td><td>' + achievement.displayName + '</td><td class="achievement-players">&nbsp;</td>';
        $('#achievement-row-noadventuringtime').before(achievement_html);
    });
    $('#achievement-row-loading').remove();
}

function displayAchievementsStatData(achievementData, achievementStatData, people) {
    $.when(people.mapObject(achievementStatData)).done(function(statData) {
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
        statData.forEach(function(playerStatsPair) {
            var person = playerStatsPair.player;
            var achievementStats = playerStatsPair.value;
            if (person == undefined) {
                return;
            }
            var takenMainTrack = [];
            var missingNoTrack = noTrack.slice(0); // copy of noTrack
            var hasAdventuringTime = false;
            $.each(achievementStats, function(achievementID, value) {
                var achievement = new Achievement(achievementData, achievementID);
                if (achievement.track == 'main') {
                    if (value > 0) {
                        takenMainTrack.push(achievementID);
                    }
                } else if (achievement.track == 'biome') {
                    if (value['value'] > 0) {
                        hasAdventuringTime = true;
                    }
                } else {
                    if (value > 0) {
                        missingNoTrack.splice(missingNoTrack.indexOf(achievementID), 1);
                    }
                }
            });
            var mainTrackProgress = 'none';
            // move player down
            mainTrack.forEach(function(achievement) {
                if (takenMainTrack.indexOf(achievement.id) > -1) {
                    mainTrackProgress = achievement.id;
                }
            });
            if (mainTrackProgress == mainTrack.slice(-1)[0].id && missingNoTrack.length == 0) {
                if (hasAdventuringTime) {
                    mainTrackProgress = 'all';
                } else {
                    mainTrackProgress = 'noadventuringtime';
                }
            }
            mainTrackPlayers[mainTrackProgress].push(person);
        });
        $.each(mainTrackPlayers, function(achievementID, peopleList) {
            $('#achievement-row-' + achievementID).children('.achievement-players').html(htmlPlayerList(people.sorted(peopleList)));
        });
    }).fail(function() {
        $('#stats-achievements-table-main-track').children('tbody').html($('<tr>').html($('<td>', {class: 'text-danger', colspan: 3}).text('error, try refreshing')));
    });
}

function displayBiomesStatData(achievementStatData, biomeData, people) {
    $.when(people.mapObject(achievementStatData)).done(function(statData) {
        var adventuringTimeBiomes = [];
        $.each(biomeData.biomes, function(biomeNumberString, biomeInfo) {
            if ('adventuringTime' in biomeInfo && biomeInfo.adventuringTime == false) {
                return;
            }
            adventuringTimeBiomes.push(biomeInfo.id);
        });
        var biomeStats = {};
        biomeStats[adventuringTimeBiomes.length.toString()] = [];
        statData.forEach(function(playerStatsPair) {
            var person = playerStatsPair.player;
            var achievementStats = playerStatsPair.value;
            if (person == undefined) {
                return;
            }
            var numBiomes = 0;
            if ('exploreAllBiomes' in achievementStats) {
                if ('value' in achievementStats.exploreAllBiomes && achievementStats.exploreAllBiomes.value > 0) {
                    numBiomes = achievementStats.exploreAllBiomes.progress.length;
                } else if ('progress' in achievementStats.exploreAllBiomes) {
                    achievementStats.exploreAllBiomes.progress.forEach(function(biomeID) {
                        if ($.inArray(biomeID, adventuringTimeBiomes) != -1) {
                            numBiomes++;
                        }
                    });
                }
            }
            if (!(numBiomes.toString() in biomeStats)) {
                biomeStats[numBiomes.toString()] = [];
            }
            biomeStats[numBiomes.toString()].push(person);
        });
        $.each(biomeStats, function(numBiomes, peopleList) {
            $tr = $('<tr>').html($('<td>').html(numBiomes));
            $tr.append($('<td>').html(htmlPlayerList(people.sorted(peopleList))));
            if (peopleList.length || numBiomes == adventuringTimeBiomes.length) {
                $('#stats-achievements-table-biome-track tbody tr:last').after(peopleList.length ? $tr : $('<tr>').html($('<td>', {class: 'muted', colspan: '2'}).text(numBiomes + ' biomes required for Adventuring Time')));
            };
        });
        $('#loading-achievements-table-biome-track').remove();
    }).fail(function() {
        $('#achievement-row-loading').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
}

function displayDeathGamesLog(deathGamesLog, people) {
    deathGamesLog.log.forEach(function(logEntry) {
        $.when(people.personById(logEntry.attacker), people.personById(logEntry.target)).done(function(attacker, target) {
            $tr = $('<tr>').html('<td>' + logEntry.date + '</td>');
            $tr.append($('<td>').html(htmlPlayerList([attacker])));
            $tr.append($('<td>').html(htmlPlayerList([target])));
            $tr.append($('<td>').html(logEntry.success ? '<span class="fa fa-check fa-fw text-success"></span>' : '<span class="fa fa-times fa-fw text-danger"></span>'));
            $('#loading-deathgames-log').after($tr);
        }).fail(function() {
            $('#loading-deathgames-log').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
        });
    });
    $('#loading-deathgames-log').remove();
}

function displayDeathGamesStatData(deathGamesLog, people) {
    var log = deathGamesLog.log;
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
    };
    $.when('participating' in deathGamesLog ? people.peopleByID(deathGamesLog.participating) : people.activePeople).done(function(participating) {
        participating = people.sorted(participating);
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
            statRow.children('.leading-player').html(htmlPlayerList(bestPlayers));
            if (bestValue === null) {
                statRow.children('.value').html('');
            } else {
                statRow.children('.value').html(bestValue);
            }
            statRow.children('.second-player').html(htmlPlayerList(secondPlayers));
            if (secondValue === null) {
                statRow.children('.secondvalue').html('');
            } else {
                statRow.children('.secondvalue').html(secondValue);
            }
        });
    }).fail(function() {
        $.each(stats, function(statName, statFunction) {
            var statRow = $('#deathgames-stat-row-' + statName);
            statRow.children('.leading-player').html($('<span>', {class: 'text-danger'}).text('(error)'));
            statRow.children('.value').html($('<span>', {class: 'text-danger'}).text('(error)'));
            statRow.children('.second-player').html($('<span>', {class: 'text-danger'}).text('(error)'));
            statRow.children('.secondvalue').html($('<span>', {class: 'text-danger'}).text('(error)'));
        });
    });
}

function loadLeaderboardStatData(people) {
    $.when(API.statData(), API.stringData()).done(function(statData, stringData) {
        displayLeaderboardStatData(statData, stringData, people);
    }).fail(function() {
        $('#loading-stat-leaderboard-table').html('<td colspan="5">Error: Could not load leaderboard stats from API</td>');
    });
}

function loadMobStatData(people) {
    $.when(API.mainWorld()).done(function(mainWorld) {
        $.when(API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + mainWorld + '/playerstats/entity.json'), API.entityData()).done(function(entityStats, entityData) {
            displayMobsStatData(people, entityStats, entityData);
        }).fail(function() {
            $('#loading-mobs-bymob').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
        });
    }).fail(function() {
        $('#loading-mobs-bymob').children('td').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
    });
}

function loadAchievementsStatData(people) {
    $.when(API.biomes(), API.items(), API.achievementData(), API.achievementStatData()).done(function(biomeData, items, achievementData, achievementStatData) {
        prepareAchievements(achievementData, items);
        displayAchievementsStatData(achievementData, achievementStatData, people);
        displayBiomesStatData(achievementStatData, biomeData, people);
    }).fail(function() {
        $('#achievement-row-loading').html($('<td>', {colspan: 3, class: 'text-danger'}).text('Error: could not load achievements'));
        $('#loading-achievements-table-biome-track').html($('<td>', {colspan: 3, class: 'text-danger'}).text('Error: could not load biomes'));
    });
}

function loadDeathgamesStatData(people) {
    $.when(API.deathGamesLog()).done(function(deathGamesLog) {
        displayDeathGamesLog(deathGamesLog, people);
        displayDeathGamesStatData(deathGamesLog, people);
    }).fail(function() {
        $('#loading-deathgames-log').html($('<td>', {colspan: 4, class: 'text-danger'}).text('Error: could not load Death Games log'));
    });
}

function loadStatData() {
    $.when(API.people()).done(function(people) {
        loadLeaderboardStatData(people);
        loadMobStatData(people);
        loadAchievementsStatData(people);
        loadDeathgamesStatData(people);
    }).fail(function() {
        $('#loading-stat-leaderboard-table').html($('<td>', {colspan: 5, class: 'text-danger'}).text('Error: could not load people data'));
        $('#loading-mobs-bymob').children('td').html($('<span>', {class: 'text-danger'}).text('Error: could not load people data'));
        $('#achievement-row-loading').html($('<td>', {colspan: 3, class: 'text-danger'}).text('Error: could not load people data'));
        $('#loading-achievements-table-biome-track').html($('<td>', {colspan: 3, class: 'text-danger'}).text('Error: could not load people data'));
        $('#loading-deathgames-log').html($('<td>', {colspan: 4, class: 'text-danger'}).text('Error: could not load people data'));
    });
}

selectTabWithID("tab-stats-leaderboard");
bindTabEvents();
loadStatData();
