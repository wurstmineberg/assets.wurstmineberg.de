function getOnlineData(list) {
    $.when(API.people()).done(function(people) {
        if (list.length == 0) {
            $('#peopleCount').html('none of the <span id="whitelistCount">(loading)</span> whitelisted players are');
        } else {
            $('#punctuation').html(':');
            if (list.length == 1) {
                $('#peopleCount').html('one of the <span id="whitelistCount">(loading)</span> whitelisted players is');
            } else {
                $('#peopleCount').html(list.length + ' of the <span id="whitelistCount">(loading)</span> whitelisted players are');
            }
        }
        $('#whitelistCount').html(people.activePeople.length);
        onlinePeople = people.peopleByID(list);
        $.when(onlinePeople).done(function(onlinePeople) {
            $('#peopleList').html(htmlPlayerList(people.sorted(onlinePeople)));
        }).fail(function() {
            $('#peopleList').html($('<span>', {class: 'text-danger'}).text('error, try refreshing'));
        });
    }).fail(function() {
        $('#peopleCount').html($('<span>', {class: 'text-danger'}).text('(error)'));
        $('#whitelistCount').html($('<span>', {class: 'text-danger'}).text('(error)'));
    });
};

function displayServerStatus() {
    $.when(API.serverStatus()).done(function(data) {
        if (data.running) {
            getVersionURL(data.version, function(versionURL) {
                $('#serverinfo').html('The server is currently <strong>online</strong> and running on version <a href="' + versionURL + '" style="font-weight: bold;">' + data.version + '</a>, and <span id="peopleCount">(loading) of the <span id="whitelistCount">(loading)</span> whitelisted players are</span> currently active<span id="punctuation">.</span><br /><span id="peopleList"></span>');
                getOnlineData(data.list);
            });
        } else {
            $('#serverinfo').html('The server is <strong>offline</strong> right now. For more information, consult the <a href="https://twitter.com/wurstmineberg">Twitter account</a>.');
        }
    }).fail(function(data) {
        $('serverinfo').html('An error occurred while checking the server status. For more information, consult the <a href="https://twitter.com/wurstmineberg">Twitter account</a>.');
    });
}

displayServerStatus();
