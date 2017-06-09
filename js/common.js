var isDev = /^([0-9a-z]+\.)?dev\.([0-9a-z]+\.)?wurstmineberg\.de$/.test(location.hostname);
var host = isDev ? 'dev.wurstmineberg.de' : 'wurstmineberg.de';

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

function thousands(value, sep) { // inserts thousands separators (default: narrow no-break spaces) into numbers
    sep = typeof sep === 'undefined' ? '\u202f' : sep;
    var value = value.toString();
    if (value.length > 3) {
        value = value.replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    return value;
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

function Person(personID, personData) {
    var _this = this;
    this.id = personID;
    if (/^[a-z][0-9a-z]{1,15}$/.test(this.id)) {
        this.wurstminebergID = this.id;
        if ('minecraft' in personData && 'uuid' in personData.minecraft) {
            this.minecraftUUID = personData.minecraft.uuid;
        } else {
            this.minecraftUUID = null;
        }
    } else {
        this.minecraftUUID = this.id;
    }
    this.description = personData.description;
    this.favColor = personData.favColor;
    if ('base' in personData) {
        this.favItem = personData.base[0].tunnelItem;
    }
    this.gravatar = personData.gravatar;
    this.invitedBy = function() {
        var ret = null;
        if ('statusHistory' in personData) {
            personData.statusHistory.forEach(function(statusChange) {
                if (ret !== null) {
                    return;
                }
                if ((statusChange.status === 'invited' || statusChange.status === 'later') && 'by' in statusChange) {
                    ret = statusChange.by;
                }
            });
        }
        return ret;
    }();
    this.joinDate = function() { // date of whitelisting, not invitation date
        var ret = null;
        if ('statusHistory' in personData) {
            personData.statusHistory.forEach(function(statusChange) {
                if (ret !== null) {
                    return;
                }
                if ((statusChange.status === 'later') && 'date' in statusChange) {
                    ret = dateObjectFromUTC(statusChange.date);
                }
            });
        }
        return ret;
    }();
    this.latestDeath = function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/deaths/latest.json').then(function(latestDeaths) {
                if (_this.id in latestDeaths.deaths) {
                    return {
                        'cause': latestDeaths.deaths[_this.id].cause,
                        'timestamp': dateObjectFromUTC(latestDeaths.deaths[_this.id].timestamp)
                    };
                } else {
                    return null;
                }
            });
        });
    }
    if ('minecraft' in personData) {
        this.minecraft = personData.minecraft.nicks[personData.minecraft.nicks.length - 1];
    }
    if ('statusHistory' in personData) {
        this.status = personData.statusHistory[personData.statusHistory.length - 1].status;
    }
    this.statusHistory = personData.statusHistory;
    if ('twitter' in personData) {
        this.twitter = personData.twitter.username;
    }
    this.website = personData.website;
    this.wiki = personData.wiki;
    this.option = function(opt) {
        var defaultTrueOptions = ['activity_tweets', 'chatsync_highlight', 'inactivity_tweets']; // These options are on by default. All other options are off by default.
        if ('options' in personData && opt in personData['options']) {
            return personData.options[opt];
        } else {
            return opt in defaultTrueOptions;
        }
    };
    this.optionIsDefault = function(opt) {
        return !('options' in personData && opt in personData.options);
    }
    this.interfaceName = function() {
        if ('name' in personData) {
            return personData.name;
        } else if (typeof _this.wurstminebergID !== 'undefined') {
            return _this.wurstminebergID;
        } else if (typeof _this.minecraft !== 'undefined') {
            return _this.minecraft;
        } else {
            return _this.minecraftUUID;
        }
    }();
    this.wikiArticle = function(fallback) {
        if (_this.wiki) {
            return wikiUserLink(_this.wiki);
        } else {
            return fallback;
        }
    }
}

function People(peopleData) {
    var _this = this;

    this.list = function() {
        return _.map(_.sortBy(_.pairs(peopleData), function(keyValuePair) {
            var wurstminebergID = keyValuePair[0];
            var personData = keyValuePair[1];
            var date = '9999-99-99 99:99:99';
            if ('statusHistory' in personData) {
                personData.statusHistory.forEach(function(statusChange) {
                    if (date !== '9999-99-99 99:99:99') {
                        return
                    }
                    if ('date' in statusChange) {
                        date = statusChange.date;
                    }
                });
            }
            return date + wurstminebergID;
        }), function(keyValuePair) {
            var wurstminebergID = keyValuePair[0];
            var personData = keyValuePair[1];
            return new Person(wurstminebergID, personData);
        });
    }();

    this.achievementScores = function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/minigame/achievements/' + world + '/scoreboard.json').then(_this.mapObject);
        });
    };

    this.achievementWinners = function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/minigame/achievements/' + world + '/winners.json').then(_this.mapObject);
        });
    };

    this.activePeople = function() {
        return _this.list.filter(function(person) {
            return (person.status === 'founding' || person.status === 'later');
        });
    }();

    this.count = this.list.length;

    this.personById = function(id) {
        if (/^[a-z][0-9a-z]{1,15}$/.test(id)) {
            // Wurstmineberg ID
            return $.when(_.find(this.list, function(person) {
                return 'id' in person && person.id === id;
            }));
        } else if (/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/.test(id)) {
            // Minecraft UUID
            return API.personById(id);
        } else {
            return $.Deferred().reject('invalid person ID format');
        }
    };

    this.peopleByID = function(list) {
        return _.reduce(list, function(future, playerID) {
            return $.when(future, _this.personById(playerID)).then(function(list, player) {
                return list.concat([player]);
            });
        }, $.when([]));
    }

    this.mapObject = function(object) {
        return _.reduce(_.pairs(object), function(future, keyValuePair) {
            return $.when(future, _this.personById(keyValuePair[0])).then(function(list, player) {
                return _.sortBy(list.concat({
                    player: player,
                    value: keyValuePair[1]
                }), function(playerValuePair) {
                    return _this.sortKey(playerValuePair.player);
                });
            });
        }, $.when([]));
    }

    this.personByMinecraft = function(id) {
        return _.find(this.list, function(person) {
            return 'minecraft' in person && person.minecraft === id;
        });
    };

    this.sortKey = function(person) {
        if (typeof person.wurstminebergID === 'undefined') {
            return _this.list.length; // unknown person, sort after known people
        } else {
            return _.findIndex(_this.list, function(iterPerson) { return iterPerson.wurstminebergID === person.wurstminebergID; });
        }
    }

    this.sorted = function(peopleList) {
        if (typeof peopleList === 'undefined') {
            return _this.list;
        }
        return _.sortBy(_.map(peopleList, function(person) {
            if (typeof person === 'string') {
                return _this.personById(person);
            } else {
                return person;
            }
        }), _this.sortKey);
    };
}

function Biome(biomeData) {
    this.id = biomeData.id;

    this.description = function() {
        if ('description' in biomeData) {
            return biomeData.description;
        } else {
            return '';
        }
    }();

    this.type = biomeData.type;
    this.name = function() {
        if ('name' in biomeData) {
            return biomeData.name;
        } else {
            return biomeData.id;
        }
    }();

    this.adventuringTime = function() {
        if ('adventuringTime' in biomeData) {
            return biomeData.adventuringTime;
        } else {
            return true;
        }
    }();
}

function BiomeInfo(biomeInfo) {
    this.biomes = function() {
        var biomesList = _.map(biomeInfo.biomes, function(biomeData) {
            return new Biome(biomeData);
        });

        biomesList.sort(function(a, b) {
            return a.id.localeCompare(b.id);
        });

        return biomesList;
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

function Item(stringID, itemInfo) {
    _.extend(this, itemInfo);
    this.htmlImage = function(classes, tint, damage) {
        if ('image' in itemInfo) {
            var imageInfo = typeof itemInfo.image === 'string' ? {prerendered: itemInfo.image} : itemInfo.image;
            var baseClasses = classes || '';
            if (imageInfo.nearestNeighbor) {
                baseClasses += ' nearest-neighbor';
            }
            if (typeof tint === 'undefined' || tint === null) {
                var damageFound = 0;
                var result = '<img src="//assets.' + host + '/img/grid/' + imageInfo.prerendered + '" class="' + baseClasses + '" />';
                if ('damagedImages' in itemInfo && typeof damage !== 'undefined') {
                    $.each(itemInfo.damagedImages, function(damageStr, damagedImage) {
                        if (parseInt(damageStr) > damageFound && parseInt(damageStr) <= damage) {
                            damageFound = parseInt(damageStr);
                            var imageInfo = typeof damagedImage === 'string' ? {prerendered: damagedImage} : damagedImage;
                            var damagedClasses = classes || '';
                            if (imageInfo.nearestNeighbor) {
                                damagedClasses += ' nearest-neighbor';
                            }
                            result = '<img src="//assets.' + host + '/img/grid/' + imageInfo.prerendered + '" class="' + damagedClasses + '" />';
                        }
                    });
                }
                return result;
            } else {
                return '<img style="background: url(//api.' + host + '/v2/minecraft/items/render/dyed-by-id/' + stringID.split(':')[0] + '/' + stringID.split(':')[1] + '/' + zeroFill(tint.toString(16), 6) + '.png)" src="//assets.' + host + '/img/grid-overlay/' + imageInfo.prerendered + '" class="' + baseClasses + '" />';
            }
        } else {
            return '';
        }
    };
    this.id = stringID;
    this.durability = 'durability' in itemInfo ? itemInfo.durability : 0;
    this.isBlock = 'blockID' in itemInfo;
    this.isItem = 'itemID' in itemInfo;
}

function ItemData(itemData) {
    this.itemById = function(id) {
        if (_.isString(id) && /^[0-9]+$/.test(id)) {
            id = parseInt(id);
        }
        var item = undefined;
        if (_.isString(id)) {
            var idParts = id.split(':');
            var plugin = idParts[0];
            var name = idParts[1];
            item = itemData[plugin][name];
        } else {
            var numericID = id;
            $.each(itemData, function(pluginName, plugin) {
                $.each(plugin, function(stringID, itemInfo) {
                    if (itemInfo.itemID == id || itemInfo.blockID == id) {
                        id = pluginName + ':' + stringID;
                        item = itemInfo;
                    }
                });
            });
        }
        return new Item(id, item);
    }
    this.itemByDamage = function(id, damage) {
        item = this.itemById(id);
        if ('damageValues' in item) {
            if (typeof damage !== 'undefined' && damage.toString() in item.damageValues) {
                item = _.extend({}, item, item.damageValues[damage.toString()]);
            }
            item = _.omit(item, 'damageValues');
        } else {
            return undefined;
        }
        return new Item(id, item);
    };
    this.itemByEffect = function(id, effect) {
        item = this.itemById(id);
        if ('effects' in item) {
            if (_.isString(effect)) {
                var effectParts = effect.split(':');
                var effectPlugin = effectParts[0];
                var effectName = effectParts[1];
                item = _.extend({}, item, item.effects[effectPlugin][effectName]);
            }
            item = _.omit(item, 'effects');
        } else {
            return undefined;
        }
        return new Item(id, item);
    };
    this.itemByTag = function(id, tagValue) {
        item = this.itemById(id);
        if ('tagPath' in item) {
            if (typeof tagValue === 'undefined' || tagValue === null) {
                item = _.extend({}, item, item.tagVariants['']);
            } else if (tagValue.toString() in item.tagVariants) {
                item = _.extend({}, item, item.tagVariants[tagValue.toString()]);
            }
            item = _.omit(item, 'tagPath');
            item = _.omit(item, 'tagVariants');
        } else {
            return undefined;
        }
        return new Item(id, item);
    };
    this.itemFromStub = function(itemStub) {
        if (typeof itemStub === 'string') {
            return this.itemById(itemStub);
        }
        if ('damage' in itemStub) {
            return this.itemByDamage(itemStub.id, itemStub.damage);
        } else if ('effect' in itemStub) {
            return this.itemByEffect(itemStub.id, itemStub.effect);
        } else if ('tagValue' in itemStub) {
            return this.itemByTag(itemStub.id, itemStub.tagValue);
        } else {
            return this.itemById(itemStub.id);
        }
    }
    this.favItem = function(person) {
        if (!person.favItem) {
            return null;
        }
        return this.itemFromStub(person.favItem);
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
        return items.itemFromStub(achievementData[achievementID].icon);
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

function advancementImage(advancementInfo, items, complete) {
    if (typeof complete === 'undefined') {
        complete = false;
    }
    var item;
    if ('data' in advancementInfo.display.icon) {
        item = items.itemByDamage(advancementInfo.display.icon.item, advancementInfo.display.data);
    } else {
        item = items.itemById(advancementInfo.display.icon.item);
    }
    var borderStyle;
    if ('frame' in advancementInfo.display) {
        borderStyle = advancementInfo.display.frame;
    } else {
        borderStyle = 'task';
    }
    return $('<div>', {class: 'advancement-image nearest-neighbor advancement-image-' + borderStyle + (complete ? ' advancement-image-complete' : '')}).html(item.htmlImage());
}

function renderTellraw(tellrawData, lang) {
    // formats a Minecraft Chat component
    // http://wiki.vg/Chat
    function renderInner(tellrawData, style) {
        if (typeof tellrawData === 'string') {
            return $('<span>').text(tellrawData);
        } else if (Array.isArray(tellrawData)) {
            if (tellrawData.length > 0) {
                var parent = tellrawData[0];
                if (typeof parent === 'string') {
                    parent = {
                        text: parent
                    };
                } else {
                    parent = JSON.parse(JSON.stringify(parent));
                }
                parent.extra = tellrawData.slice(1);
                return renderInner(parent, style);
            } else {
                return $('<span>');
            }
        } else {
            // update style
            var style = JSON.parse(JSON.stringify(style));
            if ('bold' in tellrawData) {
                style.bold = tellrawData.bold;
            }
            if ('italic' in tellrawData) {
                style.italic = tellrawData.italic;
            }
            if ('underlined' in tellrawData) {
                style.underlined = tellrawData.underlined;
            }
            if ('strikethrough' in tellrawData) {
                style.strikethrough = tellrawData.strikethrough;
            }
            if ('obfuscated' in tellrawData) {
                style.obfuscated = tellrawData.obfuscated;
            }
            if ('color' in tellrawData) {
                style.color = tellrawData.color;
            }
            // generate text
            var text;
            if ('text' in tellrawData) {
                text = tellrawData.text;
            } else if ('translate' in tellrawData) {
                var with_array;
                if ('with' in tellrawData) {
                    with_array = tellrawData.with;
                } else {
                    with_array = [];
                }
                text = vsprintf(lang[tellrawData.translate], with_array);
            } else if ('keybind' in tellrawData) {
                var keys = {
                    'key.attack': 'Left Click',
                    'key.use': 'Right Click',
                    'key.forward': 'W',
                    'key.left': 'A',
                    'key.back': 'S',
                    'key.right': 'D',
                    'key.jump': 'SPACE',
                    'key.sneak': 'LSHIFT',
                    'key.sprint': 'LCONTROL',
                    'key.drop': 'Q',
                    'key.inventory': 'E',
                    'key.chat': 'T',
                    'key.playerlist': 'TAB',
                    'key.pickItem': 'Middle Click',
                    'key.command': 'SLASH',
                    'key.screenshot': 'F2',
                    'key.togglePerspective': 'F5',
                    'key.smoothCamera': 'NONE',
                    'key.fullscreen': 'F11',
                    'key.spectatorOutlines': 'NONE',
                    'key.swapHands': 'F',
                    'key.hotbar.1': '1',
                    'key.hotbar.2': '2',
                    'key.hotbar.3': '3',
                    'key.hotbar.4': '4',
                    'key.hotbar.5': '5',
                    'key.hotbar.6': '6',
                    'key.hotbar.7': '7',
                    'key.hotbar.8': '8',
                    'key.hotbar.9': '9'
                };
                text = keys[tellrawData.keybind];
            } else if ('score' in tellrawData) {
                //TODO
            }
            // render as HTML
            var classes = [];
            if (style.bold) {
                classes.push('tellraw-bold');
            }
            if (style.italic) {
                classes.push('tellraw-italic');
            }
            if (style.underlined) {
                classes.push('tellraw-underlined');
            }
            if (style.strikethrough) {
                classes.push('tellraw-strikethrough');
            }
            //TODO obfuscated
            var attrs = {class: classes.join(' ')};
            if (color !== null) {
                //TODO color
            }
            var result = $('<span>', attrs).text(text);
            if ('extra' in tellrawData) {
                tellrawData.extra.forEach(function(extraPart) {
                    result.append(renderInner(extraPart, style));
                });
            }
            return result;
        }
    }
    return renderInner(tellrawData, {
        bold: false,
        italic: false,
        underlined: false,
        strikethrough: false,
        obfuscated: false,
        color: null
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
    serverStatus: function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/status.json');
        });
    },
    stringData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/strings.json');
    },
    entityData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/entities.json');
    },
    itemData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/items.json');
    },
    items: function() {
        return API.itemData().then(function(itemData) {
            return new ItemData(itemData);
        });
    },
    lang: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/lang.json');
    },
    achievementData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/achievements.json');
    },
    advancementsOverview: function() {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/minecraft/advancements/overview.json');
    },
    achievement: function(achievementID) {
        return API.achievementData().then(function(achievementData) {
            return new Achievement(achievementData, achievementID);
        });
    },
    advancement: function(advancementID) {
        var idParts = advancementID.split(':');
        var plugin = idParts[0];
        var idPath = idParts[1];
        if (plugin == 'minecraft') {
            return API.ajaxJSONDeferred('//assets.' + host + '/json/advancements/' + idPath + '.json');
        } else {
            return $.Deferred().reject('custom advancements are not yet supported');
        }
    },
    peopleData: function() {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/people.json');
    },
    people: function() {
        return API.peopleData().then(function(peopleData) {
            return new People(peopleData.people);
        });
    },
    personById: function(playerID) {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/player/' + playerID + '/info.json').then(function(personData) {
            return new Person(playerID, personData);
        }, function(deferred, error, description) {
            return undefined;
        });
    },
    statData: function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/playerstats/general.json');
        });
    },
    advancementsStatData: function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/advancements/all.json');
        });
    },
    achievementStatData: function(world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/playerstats/achievement.json');
        });
    },
    playerData: function(person, world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/player/' + person.id + '/playerdata.json');
        });
    },
    personStatData: function(person, world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/player/' + person.id + '/stats.json');
        });
    },
    personAdvancementsData: function(person, world) {
        return mainWorldFallback(world).then(function(world) {
            return API.ajaxJSONDeferred('//api.' + host + '/v2/world/' + world + '/player/' + person.id + '/advancements.json');
        });
    },
    moneys: function() {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/meta/moneys.json');
    },
    biomeData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/biomes.json');
    },
    biomes: function() {
        return API.biomeData().then(function(biomeData) {
            return new BiomeInfo(biomeData);
        });
    },
    deathGamesLog: function() {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/minigame/deathgames/log.json');
    },
    lastSeen: function(person) {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/server/sessions/lastseen.json').then(function(lastSeenData) {
            if (person.id in lastSeenData) {
                return dateObjectFromUTC(lastSeenData[person.id].time);
            } else {
                return null;
            }
        });
    },
    worldData: function() {
        return API.ajaxJSONDeferred('//api.' + host + '/v2/server/worlds.json');
    },
    mainWorld: function() {
        return API.worldData().then(function(worldData) {
            var ret = undefined;
            $.each(worldData, function(worldName, worldInfo) {
                if (worldInfo.main) {
                    ret = worldName;
                }
            });
            return ret;
        });
    },
    enchantmentData: function() {
        return API.ajaxJSONDeferred('//assets.' + host + '/json/enchantments.json');
    }
}

function mainWorldFallback(world) {
    if (typeof world === 'undefined') {
        return API.mainWorld();
    } else {
        return $.when(world);
    }
}

function bindTabEvents() {
    $('.tab-item').bind('click', function(eventObject) {
        eventObject.preventDefault();
        $(this).tab('show');
    });
    $('.tab-item').on('show.bs.tab', function(e) {
        var id = $(this).attr('id')
        var elementid = id.substring('tab-'.length, id.length);
        var selected = $('#' + elementid);
        $('.section').each(function(index, element) {
            var table = $(element);
            if (table.attr('id') == selected.attr('id')) {
                table.removeClass('hidden');
            } else {
                table.addClass('hidden');
            }
        });
    });
    window.onhashchange = function() {
        if (location.hash !== '') {
            $('a[href="' + location.hash + '"]').tab('show');
        }
    };
    window.onhashchange();
    return $('a.tab-item').on('shown.bs.tab', function(e) {
        return location.hash = $(e.target).attr('href').substr(1);
    });
}

function selectTabWithID(id) {
    $('#' + id).tab('show');
}

function wikiUserLink(username) {
    username = username.replace(/ /g, '_');
    return '//wiki.' + host + '/' + username;
}

function initializeTooltips() {
    $(function () {
        $("[rel='tooltip']").tooltip();
        $(".use-tooltip").tooltip();
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

function linkifyHeaders() {
    // Do the stuff to the headers to linkify them

    $.each($('h2'), function() {
        $(this).addClass('anchor');
        $(this).append('&nbsp;<a class="tag" href="#' + $(this).attr('id') + '">¶</a>');
    });
    $('h2').hover(function() {
        $(this).children('.tag').css('display', 'inline');
    }, function() {
        $(this).children('.tag').css('display', 'none');
    });
}

function configureNavigation() {
    var navigation_items = $('#navbar-list > li');
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

function setAnchorHeight() {
    var navigation_height = $('.navbar').css('height');
    var anchor = $('.anchor');

    anchor.css('padding-top', '+=' + navigation_height);
    anchor.css('margin-top', '-=' + navigation_height);
}

function minecraftTicksToRealMinutes(minecraftTicks) {
    return minecraftTicks / 1200;
}

function prettifyStatsValue(key, value) {
    if (key.endsWith('OneCm')) {
        // unit: meters
        if (value > 100000) {
            return (value / 100000).toFixed(2) + 'km';
        } else if (value > 100) {
            return (value / 100).toFixed(2) + 'm';
        } else {
            return value + 'cm';
        }
    } else if (key == 'playOneMinute' || key == 'timeSinceDeath' || key == 'sneakTime') {
        // unit: seconds
        var minutes = minecraftTicksToRealMinutes(value);
        var hours = 0;
        var days = 0;
        if (minutes >= 60) {
            hours = Math.floor(minutes / 60);
            minutes = minutes % 60;
        } else if (minutes >= 1) {
            return Math.floor(minutes) + 'min ' + Math.floor(value / 20) % 60 + 'sec';
        } else {
            return Math.floor(value / 20) + 'sec';
        }
        if (hours >= 24) {
            days = Math.floor(hours / 60);
            hours = hours % 24;
        }
        var finalValue = '';
        if (days) {
            finalValue += days + 'd';
            if (hours) {
                finalValue += ' ';
            }
        }
        if (hours) {
            finalValue += hours + 'h';
            if (minutes) {
                finalValue += ' ';
            }
        }
        if (minutes) {
            finalValue += Math.floor(minutes) + 'min';
        }
        return finalValue;
    } else if (key.startsWith('damage')) {
        // unit: hearts
        return (Math.floor(value / 10) / 2) + ' hearts';
    } else if (key == 'talkedToVillager' || key == 'tradedWithVillager' || key == 'sleepInBed') {
        // unit: times
        if (value == 0) {
            return 'never';
        } else if (value == 1) {
            return 'once';
        } else if (value == 2) {
            return 'twice';
        } else {
            return value + ' times';
        }
    } else if (key == 'cauldronUsed') {
        // unit: bottles
        return value + ' bottle' + (value == 1 ? '' : 's');
    } else {
        // no unit
        return thousands(value);
    }
}

function htmlPlayerList(people, showAvatars, text, urls, useWikiArticles) {
    showAvatars = typeof showAvatars === 'undefined' ? true : showAvatars;
    useWikiArticles = typeof useWikiArticles === 'undefined' ? false : useWikiArticles;
    var $list = $('<span>');
    $.each(people, function(index, person) {
        if (index >= 1) {
            $list.append(', ');
        }
        var personText = typeof text === 'undefined' ? person.interfaceName : text[index];
        var $a = $('<span>').text(personText);
        if (typeof person.wurstminebergID !== 'undefined') {
            var $a = $('<a>', {'href': (typeof urls === 'undefined' ? (useWikiArticles ? person.wikiArticle('//' + host + '/people/' + person.id) : '//' + host + '/people/' + person.id) : urls[index])}).text(personText);
        }
        if (showAvatars) {
            if (person.gravatar) {
                $a.prepend($('<img>', {
                    class: 'avatar',
                    id: 'avatar-' + person.id,
                    src: person.gravatar + '?d=404&s=16',
                    srcset: person.gravatar + '?d=404&s=16 1x, ' + person.gravatar + '?d=404&s=32 2x',
                    style: 'width: 16px; height: 16px;'
                }));
            } else {
                $a.prepend($('<img>', {
                    class: 'avatar nearest-neighbor',
                    id: 'avatar-' + person.id,
                    src: '//api.' + host + '/v2/player/' + person.id + '/skin/render/head/16.png',
                    srcset: '//api.' + host + '/v2/player/' + person.id + '/skin/render/head/16.png 1x, //api.' + host + '/v2/player/' + person.id + '/skin/render/head/32.png 2x',
                    style: 'width: 16px; height: 16px;'
                }));
            }
        }
        $list.append($('<span>', {'class': 'player-avatar-name'}).html($a));
    });
    return $list;
}

function getVersionURL(version, func) {
    if (version == null) {
        func('http://minecraft.gamepedia.com/Version_history');
    } else {
        func('http://minecraft.gamepedia.com/' + encodeURIComponent(version));
    }
}

function displayFundingData() {
    $.when(API.moneys()).done(function(moneyData) {
        $('.funding-progressbar').removeClass('active progress-striped');
        $('.funding-progressbar').empty();
        var fundingTotal = 0.0;

        // This is the beginning of the billing period: Sept-Oct 2013
        var beginMonth = 8;
        var beginYear = 2013;

        // This is the current month that is currently funded
        var fundedYear = beginYear;
        var fundedMonth = beginMonth;

        moneyData.history.forEach(function(transaction) {
            fundingTotal += transaction.amount;
            if (transaction.type === 'monthly') {
                transactionDate = transaction.date.split(/\D/);
                fundedYear = parseInt(transactionDate[0]);
                fundedMonth = parseInt(transactionDate[1]);
            }
        });

        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var abbrMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (fundedMonth == 11) {
            $('.funding-month').html(months[fundedMonth] + ' ' + fundedYear + ' to ' + months[0] + ' ' + (fundedYear + 1));
            $('.funding-month-small').html(abbrMonths[fundedMonth] + ' ' + fundedYear % 100 + ' to ' + abbrMonths[0] + ' ' + (fundedYear + 1) % 100);
        } else {
            $('.funding-month').html(months[fundedMonth] + ' to ' + months[(fundedMonth + 1) % 12] + ' ' + fundedYear);
            $('.funding-month-small').html(abbrMonths[fundedMonth] + ' to ' + abbrMonths[(fundedMonth + 1) % 12] + ' ' + fundedYear % 100);
        }

        var percent = 0;

        var fundedForThisMonth = false;

        var percent = fundingTotal * 100 / (moneyData.spendingMonthly * -1);
        if (percent >= 100) {
            $('.funding-progressbar').append('<div class="progress-bar progress-bar-success" style="width: 100%;"><span class="sr-only">100% funded</span></div>');
        } else if (percent < 0) {
            $('.funding-progressbar').append('<div class="progress-bar progress-bar-danger" style="width: 100%;"><span class="sr-only">underfunded</span></div>');
        } else {
            $('.funding-progressbar').append('<div class="progress-bar progress-bar-success" style="width: ' + percent + '%;"><span class="sr-only">' + percent + '% funded</span></div>');
            if (percent < 50) {
                $('.funding-progressbar').append('<div class="progress-bar progress-bar-warning" style="width: ' + (100 - percent) + '%;"></div>');
            }
        }
        $('.funding-progressbar').attr('title', fundingTotal.toFixed(2) + '€ out of ' + (moneyData.spendingMonthly * -1).toFixed(2) + '€');
        $('.funding-progressbar').tooltip();
    }).fail(function() {
        $('.funding-month').html('(error)');
        $('.funding-progressbar').removeClass('active');
        $('.funding-progressbar').children('.progress-bar').addClass('progress-bar-danger');
    });
}
