function displayPeopleData(people) {
    var displayedStatuses = [
        'founding',
        'later',
        'postfreeze',
        'former',
        'vetoed',
        'invited',
        'guest'
    ];
    var statusMapping = {
        invited: 'guest',
        vetoed: 'former'
    };
    people.list.forEach(function(person) {
        if (_.contains(displayedStatuses, person.status)) {
            var minecraft = '';
            var status = person.status in statusMapping ? statusMapping[person.status] : person.status;
            var $name = $('<td>', {'class': 'username'}).html($('<a>', {'href': '/people/' + person.id}).text(person.interfaceName));
            if (person.minecraft && person.minecraft.toLowerCase() !== person.interfaceName.toLowerCase()) {
                $name.append($('<p>', {'class': 'muted'}).text(person['minecraft']));
            }
            var $description;
            if (person.description) {
                $description = $('<td>', {'class': 'description'}).html(sanitized(person['description'], ['A', 'EM', 'S', 'SPAN']));
            } else {
                $description = $('<td>', {'class': 'description small muted'}).html('You can update your description using the command <code>!<a href="//wiki.' + host + '/Commands#People">People</a> ' + person.id + ' description &lt;value&gt;...</code>.');
            }
            var $tr = $('<tr>', {'id': person.id}).html($('<td>', {'class': 'people-avatar'}).html(person.html_ava(32)));
            $tr.append($name);
            $tr.append($description);
            $('#loading-' + status + "-table").before($tr);
        }
    });
    $('.loading').remove();
};

function loadPeopleData() {
    $.when(API.people()).done(function(people) {
        displayPeopleData(people);
    })
    .fail(function() {
        $('.loading').children('td').html('Error: could not load people.json');
    });
};

loadPeopleData();
