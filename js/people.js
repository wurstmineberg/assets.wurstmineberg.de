function display_people_data(people) {
    people.list.forEach(function(person) {
        if (!person.status in ['founding', 'later', 'postfreeze', 'former', 'vetoed']) {
            return;
        }
        var minecraft = '';
        var status = person.status == 'vetoed' ? 'former' : person.status;
        var $name = $('<td>', {'class': 'username'}).html($('<a>', {'href': '/people/' + person.id}).text(person.interfaceName));
        if (person.minecraft && person.minecraft.toLowerCase() !== person.interfaceName.toLowerCase()) {
            $name.append($('<p>', {'class': 'muted'}).text(person['minecraft']));
        };
        var $description;
        if (!person.description) {
            $description = $('<td>', {'class': 'description small muted'}).html('You can update your description using the command <code>!<a href="//wiki.wurstmineberg.de/Commands#People">People</a> ' + person.id + ' description &lt;value&gt;...</code>.');
        } else {
            $description = $('<td>', {'class': 'description'}).html(sanitized(person['description'], ['A', 'EM', 'S', 'SPAN']));
        }
        var $tr = $('<tr>', {'id': person.id}).html($('<td>', {'class': 'people-avatar'}).html(person.html_ava(32)));
        $tr.append($name);
        $tr.append($description);
        $('#loading-' + status + "-table").before($tr);
    });
    
    $('.loading').remove();
};

function load_people_data() {
    $.when(API.people()).done(function(people) {
        display_people_data(people);
    })
    .fail(function() {
        $('.loading').children('td').html('Error: could not load people.json');
    });
};

load_people_data();
