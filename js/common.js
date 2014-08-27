var isDev = location.hostname === 'dev.wurstmineberg.de';

function dateObjectFromUTC(s) { // modified from http://stackoverflow.com/a/15518848/667338
    if (typeof s !== 'string') {
        return undefined;
    }
    if (s.length == 10) {
        s += ' 00:00:00';
    }
    s = s.split(/\D/);
    return new Date(Date.UTC(+s[0], --s[1], +s[2], +s[3], +s[4], +s[5], 0));
}

function imageStack(images, attributes) {
    attributes = typeof attributes === 'undefined' ? {} : attributes;
    attributes['src'] = images[0];
    function errorHandler(imgs, attrs, index) {
        return function() {
            if (index >= imgs.length) {
                return;
            }
            attrs['src'] = imgs[index + 1];
            $(this).replaceWith($('<img>', attrs).on('error', errorHandler(imgs, attrs, index + 1)));
        };
    }
    
    return $('<img>', attributes).on('error', errorHandler(images, attributes, 0));
}

function zeroFill(n, l, r) { //FROM http://stackoverflow.com/a/21541030/667338
    a = String(n).match(/(^-?)([0-9A-Za-z]*)\.?([0-9A-Za-z]*)/);
    return a ? a[1] + (Array(l).join(0) + a[2]).slice(-Math.max(l, a[2].length)) + ('undefined' !== typeof r ? (0 < r ? '.' : '') + (a[3] + Array(r + 1).join(0)).slice(0, r) : a[3] ? '.' + a[3] : '') : 0;
}

function formatDate(d, includeTime) {
    var ret = d.getFullYear() + '-' + zeroFill(d.getMonth() + 1, 2) + '-' + zeroFill(d.getDate(), 2);
    if (includeTime) {
        ret += ' ' + zeroFill(d.getHours(), 2) + ':' + zeroFill(d.getMinutes(), 2) + ':' + zeroFill(d.getSeconds(), 2);
    }
    return ret;
}

function sanitized(string, allowedTags) { //FROM http://stackoverflow.com/a/11892228/667338
    allowedTags = typeof allowedTags === 'undefined' ? [] : allowedTags;
    
    function sanitize(el) {
        // Remove all tags from element `el' that aren't in the allowedTags list.
        var tags = Array.prototype.slice.apply(el.getElementsByTagName('*'), [0]);
        for (var i = 0; i < tags.length; i++) {
            if (allowedTags.indexOf(tags[i].nodeName) == -1) {
                usurp(tags[i]);
            }
        }
    }
    
    function usurp(p) {
        // Replace parent `p' with its children.
        var last = p;
        for (var i = p.childNodes.length - 1; i >= 0; i--) {
            var e = p.removeChild(p.childNodes[i]);
            p.parentNode.insertBefore(e, last);
            last = e;
        }
        p.parentNode.removeChild(p);
    }
    
    var div = document.createElement('div');
    div.innerHTML = string;
    sanitize(div);
    return div.innerHTML;
}

function Person(person_data) {
    var _this = this;
    this.id = person_data['id'];
    this.description = person_data['description'];
    this.favColor = person_data['favColor'];
    this.fav_item = person_data['fav_item'];
    this.invitedBy = person_data['invitedBy'];
    this.irc = person_data['irc'];
    this.joinDate = dateObjectFromUTC(person_data['join_date']);
    this.latestDeath = API.ajaxJSONDeferred('//api.wurstmineberg.de/server/deaths/latest.json').then(function(latestDeaths) {
        if (_this.id in latestDeaths.deaths) {
            return {
                'cause': latestDeaths.deaths[_this.id].cause,
                'timestamp': dateObjectFromUTC(latestDeaths.deaths[_this.id].timestamp)
            };
        } else {
            return null;
        }
    }); // use with when/done/fail
    this.minecraft = person_data['minecraft'];
    this.mobDeaths = function(entityStats) {
        var ret = {};
        if (_this.minecraft in entityStats) {
            $.each(entityStats[_this.minecraft], function(key, stat) {
                if (key.startsWith('stat.entityKilledBy.')) {
                    ret[key.substr('stat.entityKilledBy.'.length)] = stat;
                }
            });
        }
        return ret;
    };
    this.mobKills = function(entityStats) {
        var ret = {};
        if (_this.minecraft in entityStats) {
            $.each(entityStats[_this.minecraft], function(key, stat) {
                if (key.startsWith('stat.killEntity.')) {
                    ret[key.substr('stat.killEntity.'.length)] = stat;
                }
            });
        }
        return ret;
    };
    this.reddit = person_data['reddit'];
    this.status = 'status' in person_data ? person_data['status'] : 'later';
    this.twitter = person_data['twitter'];
    this.website = person_data['website'];
    this.wiki = person_data['wiki'];
    this.ava = '/assets/img/ava/' + this.minecraft + '.png';
    this.option = function(opt) {
        var default_true_options = ['activity_tweets', 'chatsync_highlight', 'inactivity_tweets']; // These options are on by default. All other options are off by default.
        if ('options' in person_data && opt in person_data['options']) {
            return person_data['options'][opt];
        } else {
            return opt in default_true_options;
        }
    };
    this.option_is_default = function(opt) {
        return !('options' in person_data && opt in person_data['options']);
    }
    this.interfaceName = function() {
        if ('name' in person_data) {
            return person_data['name'];
        } else if ('id' in person_data) {
            return person_data['id'];
        } else if ('minecraft' in person_data) {
            return person_data['minecraft'];
        }
    }();
    this.html_ava = function(size) {
        // custom avatar, saved in /assets
        var imageURLs = [(isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/ava/' + size + '/' + this.id + '.png'];
        var hiDPIURLs = [(isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/ava/' + (size * 2) + '/' + this.id + '.png'];
        // gravatar
        if ('gravatar' in person_data && size <= 2048) {
            imageURLs.push('http://www.gravatar.com/avatar/' + md5(person_data['gravatar']) + '?d=404&s=' + size);
            if (size <= 1024) {
                hiDPIURLs.push('http://www.gravatar.com/avatar/' + md5(person_data['gravatar']) + '?d=404&s=' + (size * 2));
            }
        }
        // player head
        imageURLs.push((isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/head/' + size + '/' + this.id + '.png');
        hiDPIURLs.push((isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/head/' + (size * 2) + '/' + this.id + '.png');
        // Steve head
        imageURLs.push((isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/head/' + size + '/Player.png');
        hiDPIURLs.push((isDev ? '' : 'http://wurstmineberg.de') + '/assets/img/head/' + (size * 2) + '/Player.png');
        //TODO do something with the hiDPI images
        return imageStack(imageURLs, {
            'class': 'avatar',
            'style': 'width: ' + size + 'px; height: ' + size + 'px;'
        });
    };
    this.wikiArticle = function(fallback) {
        if (this.wiki) {
            return wiki_user_link(this.wiki);
        } else {
            return fallback;
        }
    }
}

function People(people_data) {
    var _this = this;
    
    this.list = function() {
        return _.map(people_data, function(value) {
            return new Person(value);
        });
    }();
    
    this.achievementWinners = function() {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/minigame/achievements/winners.json').then(function(winners) {
            return _.map(winners, function(winnerID) {
                return _this.personById(winnerID);
            });
        });
    };
    
    this.activePeople = function() {
        return _this.list.filter(function(person) {
            return (person.status != 'former');
        });
    }();
    
    this.count = this.list.length;
    
    this.personById = function(id) {
        return _.find(this.list, function(person) {
            return 'id' in person && person['id'] === id;
        });
    };
    
    this.personByMinecraft = function(id) {
        return _.find(this.list, function(person) {
            return 'minecraft' in person && person['minecraft'] === id;
        });
    };
    
    this.sorted = function(peopleList) {
        peopleList = typeof peopleList === 'undefined' ? this.list : peopleList;
        var ret = [];
        this.list.forEach(function(person) {
            if (_.contains(peopleList, person.id)) {
                ret.push(person);
            } else {
                peopleList.forEach(function(otherPerson) {
                    if (person.id == otherPerson.id) {
                        ret.push(person);
                    }
                });
            }
        });
        return ret;
    };
}

function Biome(biome_data) {
    this.id = biome_data['id'];
    this.description = function() {
        if ('description' in biome_data) {
            return biome_data['description']
        } else {
            return '';
        }
    }();
    this.type = biome_data['type'];
    this.name = function() {
        if ('name' in biome_data) {
            return biome_data['name'];
        } else {
            return biome_data['id'];
        }
    }();

    this.adventuringTime = function() {
        if ('adventuringTime' in biome_data) {
            return biome_data['adventuringTime'];
        } else {
            return true;
        }
    }();
}

function BiomeInfo(biome_info) {
    this.biomes = function() {
        var biomes_list = _.map(biome_info['biomes'], function(biome_data) {
            return new Biome(biome_data);
        });

        biomes_list.sort(function(a, b) {
            return a.id.localeCompare(b.id);
        });

        return biomes_list;
    }();

    this.biomeById = function(id) {
        return _.find(this.biomes, function(biome) {
            return biome.id == id;
        });
    };

    this.biomesOfType = function(type) {
        return _.find(this.biomes, function(biome) {
            return biome.type == type;
        });
    };

    this.biomeNames = function(type) {
        return _.map(this.biomes, function(biome) {
            return biome.name;
        });
    };
}

function is_block(id) {
    return id <= 255;
}

function Item(stringID, itemInfo) {
    this.htmlImage = function(classes, tint) {
        if (itemInfo && 'image' in itemInfo) {
            if (itemInfo.image.startsWith('http://') || itemInfo.image.startsWith('https://')) {
                return '<img src="' + itemInfo.image + '" class="' + (classes || '') + '" />';
            } else if (typeof tint === 'undefined' || tint === null) {
                return '<img src="' + (isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/img/grid/' + itemInfo.image + '" class="' + (classes || '') + '" />';
            } else {
                return '<img style="background: url(' + (isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/img/grid-base/' + itemInfo.image + ')" src="' + (isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/img/grid-overlay/' + itemInfo.image + '" class="' + (classes || '') + '" />';
            }
        } else {
            return '';
        }
    };
    if (itemInfo) {
        this.id = stringID;
        this.image = itemInfo.image;
        this.name = itemInfo.name;
        this.durability = 'durability' in itemInfo ? itemInfo.durability : 0;
    }
    this.isBlock = 'blockID' in itemInfo;
}

function ItemData(itemData) {
    this.itemByDamage = function(id, damage) {
        if (_.isString(id) && /^[0-9]+$/.test(id)) {
            id = parseInt(id);
        }
        var item = undefined;
        if (_.isString(id)) {
            item = itemData[id];
        } else {
            var numericID = id;
            $.each(itemData, function(stringID, itemInfo) {
                if (itemInfo.itemID == id || itemInfo.blockID == id) {
                    id = stringID;
                    item = itemInfo;
                }
            });
        }
        if ('blockInfo' in item) {
            if (typeof numericID !== 'undefined' && numericID < 256) {
                item = $.extend({}, item, item.blockInfo);
            }
            delete item.blockInfo;
        }
        if ('damageValues' in item) {
            if (typeof damage !== 'undefined' && damage.toString() in item.damageValues) {
                item = $.extend({}, item, item.damageValues[damage.toString()]);
            }
            delete item.damageValues;
        }
        return new Item(numericID, item);
    };
    this.favItem = function(person) {
        if (!person.fav_item || !('id' in person.fav_item)) {
            return null;
        }
        return this.itemByDamage(person.fav_item.id, person.fav_item.Damage);
    };
}

function Achievement(achievementData, achievementID) {
    this.children = function() {
        return _.map(_.filter(_.pairs(achievementData), function(keyValuePair) {
            return keyValuePair[1].requires === achievementID;
        }, this), function(keyValuePair) {
            return new Achievement(achievementData, keyValuePair[0]);
        }).sort(function(a, b) {
            if (a.id < b.id) {
                return 1;
            } else if (a.id > b.id) {
                return -1;
            } else {
                return 0;
            }
        });
    };
    this.description = achievementData[achievementID].description;
    this.displayName = achievementData[achievementID].displayname;
    this.fancy = 'fancy' in achievementData[achievementID] ? achievementData[achievementID].fancy : false;
    this.hasChild = function(childID) { // recursive check if childID requires this, directly or indirectly
        return _.some(this.children(), function(achievement) {
            return achievement.id == childID || achievement.hasChild(childID);
        });
    };
    this.id = achievementID;
    this.image = function(items) {
        return this.item(items).htmlImage(this.fancy ? 'achievement-image fancy' : 'achievement-image');
    };
    this.item = function(items) {
        return items.itemByDamage(achievementData[achievementID].icon, achievementData[achievementID].iconDamage);
    };
    this.requires = achievementData[achievementID].requires ? new Achievement(achievementData, achievementData[achievementID].requires) : null;
    this.root = (this.requires === null) ? this : this.requires.root;
    this.sortIndex = function() { // the index within the achievement tree, breaks when comparing achievements from different trees
        if (this.requires === null) {
            return 0;
        }
        var index = _.map(this.requires.children(), function(achievement) {
            return achievement.id;
        }).indexOf(this.id);
        if (index == 0) {
            return this.requires.sortIndex() + 1;
        }
        var previous = this.requires.children()[index - 1];
        while (previous.children().length) {
            previous = _.last(previous.children());
        }
        return previous.sortIndex() + 1;
    };
    this.track = 'track' in achievementData[achievementID] ? achievementData[achievementID].track : null;
}

Achievement.all = function(achievementData) {
    var ret = _.map(_.keys(achievementData), function(achievementID) {
        return new Achievement(achievementData, achievementID);
    });
    ret.sort(function(a, b) {
        if (a.root.id < b.root.id) {
            return 1;
        } else if (a.root.id > b.root.id) {
            return -1;
        } else {
            return a.sortIndex() - b.sortIndex();
        }
    });
    return ret;
};

Achievement.track = function(achievementData, trackName) {
    return _.filter(Achievement.all(achievementData), function(achievement) {
        return (achievement.track === trackName);
    });
}

var API = {
    ajaxJSONDeferred: function(url) {
        return $.ajax(url, {
            dataType: 'json'
        }).then(function(ajaxData) {
            // Strips out all the extra data we don't need
            return ajaxData;
        });
    },
    serverStatus: function() {
        return API.ajaxJSONDeferred('assets/serverstatus/status.json');
    },
    stringData: function() {
        return API.ajaxJSONDeferred((isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/json/strings.json');
    },
    mobData: function() {
        return API.ajaxJSONDeferred((isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/json/mobs.json');
    },
    itemData: function() {
        return API.ajaxJSONDeferred((isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/json/items.json');
    },
    items: function() {
        return API.itemData().then(function(itemData) {
            return new ItemData(itemData);
        });
    },
    achievementData: function() {
        return API.ajaxJSONDeferred((isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/json/achievements.json');
    },
    achievement: function(achievementID) {
        return API.achievementData().then(function(achievementData) {
            return new Achievement(achievementData, achievementID);
        });
    },
    peopleData: function() {
        return API.ajaxJSONDeferred('/assets/serverstatus/people.json');
    },
    people: function() {
        return API.peopleData().then(function(people_data) {
            return new People('people' in people_data ? people_data['people'] : people_data);
        });
    },
    personById: function(player_id) {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/player/' + player_id + '/info.json')
            .then(function(person_data) {
                return new Person(person_data);
            });
    },
    statData: function() {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/server/playerstats/general.json');
    },
    achievementStatData: function() {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/server/playerstats/achievement.json');
    },
    person: function(player) {
        return API.personById(player.id)
    },
    playerData: function(person) {
        if (person.minecraft) {
            return API.ajaxJSONDeferred('//api.wurstmineberg.de/player/' + person.minecraft + '/playerdata.json');
        }
    },
    personStatData: function(person) {
        if (person.minecraft) {
            return API.ajaxJSONDeferred('//api.wurstmineberg.de/player/' + person.minecraft + '/stats.json');
        };
    },
    moneys: function() {
        return API.ajaxJSONDeferred('/assets/serverstatus/moneys.json');
    },
    biomeData: function() {
        return API.ajaxJSONDeferred((isDev ? 'http://devassets.wurstmineberg.de' : 'http://assets.wurstmineberg.de') + '/json/biomes.json');
    },
    biomes: function() {
        return API.biomeData().then(function(biome_data) {
            return new BiomeInfo(biome_data);
        });
    },
    deathGamesLog: function() {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/deathgames/log.json');
    },
    lastSeen: function(person) {
        return API.ajaxJSONDeferred('//api.wurstmineberg.de/server/sessions/lastseen.json').then(function(lastSeenData) {
            if (person.id in lastSeenData) {
                return 'leaveTime' in lastSeenData[person.id] ? dateObjectFromUTC(lastSeenData[person.id]['leaveTime']) : 'currentlyOnline';
            } else {
                return null;
            }
        });
    }
}

function bind_tab_events() {
    $('.tab-item').bind('click', function(eventObject) {
        eventObject.preventDefault();
        $(this).tab('show');
    });

    $('.tab-item').on('show.bs.tab', function(e) {
        var id = $(this).attr('id')
        var elementid = id.substring('tab-'.length, id.length);
        var selected = $('#' + elementid);
        $('.stats-section').each(function(index, element) {
            var table = $(element);
            if (table.attr('id') == selected.attr('id')) {
                table.removeClass("hidden");
            } else {
                table.addClass("hidden");
            }
        });
    });
    
    if (location.hash !== '') {
        $('a[href="' + location.hash + '"]').tab('show');
    }
    return $('a.tab-item').on('shown.bs.tab', function(e) {
        return location.hash = $(e.target).attr('href').substr(1);
    });
}

function select_tab_with_id(id) {
    $('#' + id).tab('show');
}

function url_domain(data) {
    var a = document.createElement('a');
    a.href = data;
    return a.hostname;
}

function reddit_user_link(username) {
    return 'http://www.reddit.com/user/' + username;
}

function twitter_user_link(username) {
    return 'https://twitter.com/' + username;
}

function wiki_user_link(username) {
    username = username.replace(/ /g, '_');
    return 'http://wiki.wurstmineberg.de/User:' + username;
}

function initialize_tooltips() {
    $(function () {
        $("[rel='tooltip']").tooltip();
        $("abbr").tooltip();
    });
}

// Some string functions to ease the parsing of substrings
String.prototype.startsWith = function(needle) {
    return(this.indexOf(needle) == 0);
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function linkify_headers() {
    // Do the stuff to the headers to linkify them

    $.each($('h2'), function() {
        $(this).addClass("anchor");
        $(this).append('&nbsp;<a class="tag" href="#' + $(this).attr('id') + '">¶</a>');
    });
    $('h2').hover(function() {
        $(this).children('.tag').css('display', 'inline');
    }, function() {
        $(this).children('.tag').css('display', 'none');
    });
}

function configure_navigation() {
    var navigation_items = $("#navbar-list > li");
    var windowpath = window.location.pathname;

    // Iterate over the list items and change the container of the active nav item to active
    $.each(navigation_items, function() {
        var elementlink = $(this).children($("a"))[0];
        var elementpath = elementlink.getAttribute("href");
        if (elementpath === windowpath) {
            $(this).addClass("active");
        }
    });
}

function set_anchor_height() {
    var navigation_height = $(".navbar").css("height");
    var anchor = $(".anchor");

    anchor.css("padding-top", "+=" + navigation_height);
    anchor.css("margin-top", "-=" + navigation_height);
}

function minecraft_ticks_to_real_minutes(minecraft_minutes) {
    return minecraft_minutes / 1200;
}

function prettify_stats_value(key, value) {
    var final_value = value;

    if (key.endsWith('OneCm')) {
        if (value > 100000) {
            final_value = (value / 100000).toFixed(2) + 'km';
        } else if (value > 100) {
            final_value = (value / 100).toFixed(2) + 'm';
        } else {
            final_value = value + 'cm';
        }
    } else if (key == 'playOneMinute' || key == 'timeSinceDeath') {
        var minutes = Math.floor(minecraft_ticks_to_real_minutes(value));
        var hours = 0;
        var days = 0;

        if (minutes >= 60) {
            hours = Math.floor(minutes / 60);
            minutes = minutes % 60;
        }

        if (hours >= 24) {
            days = Math.floor(hours / 60);
            hours = hours % 24;
        }

        final_value = '';
        if (days) {
            final_value += days + 'd ';
        }
        if (hours) {
            final_value += hours + 'h ';
        }
        if (minutes) {
            final_value += minutes + 'min ';
        }
    } else if (key.startsWith('damage')) {
        final_value = (Math.floor(value / 10) / 2) + ' hearts';
    } else if (key == 'talkedToVillager' || key == 'tradedWithVillager') {
        final_value = value + ' times';
    }
    return final_value;
}

function minecraft_nick_to_username(minecraft, people) {
    var playername;
    $.each(people, function(index, values) {
        if (['minecraft'] in values) {
            if (minecraft === values['minecraft']) {
                if ('name' in values) {
                    playername = values['name'];
                } else {
                    playername = values['id'];
                }
                return;
            }
        }
    });
    return playername;
}

function username_for_player_values(values) {
    if ('name' in values) {
        return values['name'];
    }
    return values['id'];
}

function username_to_minecraft_nick(username, people) {
    var minecraftname;
    
    $.each(people, function(index, values) {
        var name = username_for_player_values(values)
        if (name === username) {
            if ('minecraft' in values) {
                minecraftname = values['minecraft'];
            }
        }
    });
    
    return minecraftname;
}

function html_player_list(people, avas, text, urls, useWikiArticles) {
    avas = typeof avas === 'undefined' ? true : avas;
    useWikiArticles = typeof useWikiArticles === 'undefined' ? false : useWikiArticles;
    var $list = $('<span>');
    $.each(people, function(index, person) {
        if (index >= 1) {
            $list.append(', ');
        }
        var personText = typeof text === 'undefined' ? person.interfaceName : text[index];
        var $a = $('<a>', {'href': (typeof urls === 'undefined' ? (useWikiArticles ? person.wikiArticle((isDev ? '' : 'http://wurstmineberg.de') + '/people/' + person.id) : (isDev ? '' : 'http://wurstmineberg.de') + '/people/' + person.id) : urls[index])}).text(personText);
        if (avas) {
            $a.prepend(person.html_ava(16));
        }
        $list.append($('<span>', {'class': 'player-avatar-name'}).html($a));
    });
    return $list;
}

function get_version_url(version, func) {
    if (version == null) {
        func('http://minecraft.gamepedia.com/Version_history');
    } else {
        $.when(API.ajaxJSONDeferred('http://minecraft.gamepedia.com/api.php?format=json&action=query&titles=' + encodeURIComponent(version))).done(function(minecraft_wiki_result) {
            if ('query' in minecraft_wiki_result && 'pages' in minecraft_wiki_result['query']) {
                $.each(minecraft_wiki_result['query']['pages'], function(page_id, page_info) {
                    if ('missing' in page_info) {
                        func('http://minecraft.gamepedia.com/Version_history' + ((version.indexOf('pre') != -1 || version.substring(2,3) == 'w') ? '/Development_versions#' : '#') + version);
                    } else {
                        func('http://minecraft.gamepedia.com/' + page_info['title']);
                    }
                });
            } else {
                func('http://minecraft.gamepedia.com/Version_history' + ((version.indexOf('pre') != -1 || version.substring(2,3) == 'w') ? '/Development_versions#' : '#') + version);
            }
        }).fail(function() {
            func('http://minecraft.gamepedia.com/Version_history' + ((version.indexOf('pre') != -1 || version.substring(2,3) == 'w') ? '/Development_versions#' : '#') + version);
        });
    }
}

function display_funding_data() {
    $.when(API.moneys()).done(function(money_data) {
        $('.funding-progressbar').removeClass('active progress-striped');
        $('.funding-progressbar').empty();
        var funding_total = 0.0;
        
        money_data['history'].forEach(function(transaction) {
            if (transaction['type'] !== 'nessus-monthly') {
                funding_total += transaction['amount'];
            };
        });
        
        var today = new Date();
        
        // This is the beginning of the billing period: Sept-Oct 2013
        var begin_month = 8;
        var begin_year = 2013;
        
        // This is the current month that is currently funded
        var funded_year = begin_year;
        var funded_month = begin_month;
        
        // This is today
        var year = today.getFullYear();
        var month = today.getMonth();
        var day = today.getDay();
        
        var spending_monthly = Math.abs(money_data['spending_monthly']);
        
        // Subtract the first month
        funding_total -= spending_monthly;
        
        // Add a month until it doesn't fit anymore
        while (funding_total >= spending_monthly) {
            funded_month++;
            if (funded_month >= 12) {
                funded_year++;
                funded_month = 0;
            }
            
            funding_total -= spending_monthly;
        }
        
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var abbr_months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        if (funded_month == 11) {
            $('.funding-month').html(months[funded_month] + ' ' + funded_year + ' to ' + months[0] + ' ' + (funded_year + 1));
            $('.funding-month-small').html(abbr_months[funded_month] + ' ' + funded_year % 100 + ' to ' + abbr_months[0] + ' ' + (funded_year + 1) % 100);
        } else {
            $('.funding-month').html(months[funded_month] + ' to ' + months[(funded_month + 1) % 12] + ' ' + funded_year);
            $('.funding-month-small').html(abbr_months[funded_month] + ' to ' + abbr_months[(funded_month + 1) % 12] + ' ' + funded_year % 100);
        }
        
        var percent = 0;
        
        var funded_for_this_month = false;
        if (funded_year > year) {
            // We are funded until next year
            funded_for_this_month = true;
        } else {
            if (funded_month == month) {
                // We are in the month that is just not funded.
                // Check if the billing date is already over.
                
                if (day < money_data['billing_dom']) {
                    funded_for_this_month = true;
                }
            } else {
                funded_for_this_month = funded_month >= month;
            }
        }
        
        if (funded_for_this_month) {
            percent = Math.floor(funding_total * 100 / spending_monthly);
            $('.funding-progressbar').append('<div class="progress-bar progress-bar-success" style="width: ' + percent + '%;"><span class="sr-only">' + percent + '% funded</span></div>');
        } else {
            var expected_total = funding_total;
            
            money_data['history'].forEach(function(transaction) {
                if (transaction['type'] == 'player-monthly') {
                    var transaction_year = transaction['date'].split('-')[0];
                    var transaction_month = transaction['date'].split('-')[1];
                    var transaction_day = transaction['date'].split('-')[2];
                    if (transaction_day < money_data['billing_dom']) {
                        if ((transaction_month - 1 == month && transaction_year == year) || (month == 12 && transaction_month == 1 && transaction_year - 1 == year)) {
                            expected_total -= transaction['amount'];
                        }
                    } else if (transaction_year == year && transaction_month == month) {
                        expected_total -= transaction['amount'];
                    }
                }
            });
            
            var expected_percent = Math.max(0, Math.min(100 - percent, Math.floor(expected_total * 100 / -money_data['spending_monthly'])));
            var progress_bar_class = "progress-bar-warning";
            if (expected_percent <= 50) {
                progress_bar_class = "progress-bar-danger";
            }
            
            $('.funding-progressbar').append('<div class="progress-bar progress-bar-success" style="width: ' + expected_percent + '%;"><span class="sr-only">' + expected_percent + '% expected</span></div>');
            $('.funding-progressbar').append('<div class="progress-bar ' + progress_bar_class + '" style="width: ' + (100 - expected_percent) + '%;"><span class="sr-only">bla</span></div>');
        }
        $('.funding-progressbar').attr('title', funding_total.toFixed(2) + '€ out of ' + spending_monthly.toFixed(2) + '€');
        $('.funding-progressbar').tooltip();
    }).fail(function() {
        $('.funding-month').html('(error)');
        $('.funding-progressbar').removeClass('active');
        $('.funding-progressbar').children('.progress-bar').addClass('progress-bar-danger');
    });
}
