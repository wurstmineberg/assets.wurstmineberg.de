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
        $('#whitelistCount').html(people.activePeople().length);
        onlinePeople = list.map(function(minecraftName) {
            return people.personByMinecraft(minecraftName);
        });
        $('#peopleList').html(html_player_list(people.sorted(onlinePeople)));
    }).fail(function() {
        $('#peopleCount').text('(error)');
        $('#whitelistCount').text('(error)');
    });
};

function displayServerStatus() {
    $.when(API.serverStatus()).done(function(data) {
        if (data.on) {
            get_version_url(data.version, function(version_url) {
                $('#serverinfo').html('The server is currently <strong>online</strong> and running on version <a href="' + version_url + '" style="font-weight: bold;">' + data.version + '</a>, and <span id="peopleCount">(loading) of the <span id="whitelistCount">(loading)</span> whitelisted players are</span> currently active<span id="punctuation">.</span><br /><span id="peopleList"></span>');
                getOnlineData(data.list);
            });
        } else {
            $('#serverinfo').html('The server is <strong>offline</strong> right now. For more information, consult the <a href="http://twitter.com/wurstmineberg">Twitter account</a>.');
        }
    }).fail(function(data) {
        $('serverinfo').html('An error occurred while checking the server status. For more information, consult the <a href="https://twitter.com/wurstmineberg">Twitter account</a>.');
    });
}

displayServerStatus();
