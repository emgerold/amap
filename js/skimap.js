// GLOBAL FUNCTIONS --------------------------------------------------------------------

function startAnimations() {
    $('body').removeClass('start-animation');
}
var loadData; // for access from infowindow




$(document).ready(function(){

    var markers = [];
    var currentMarkers = [];
    var activeInfoWindow = {};
    var filters = {"years":[], "visits":[]};
    var markerBounds = new google.maps.LatLngBounds();
    var areasMap;

    // INIT MAP, START ANIMATIONS, LOAD MAP DATA ---------------------------------------------
    function initMap() {

        var mapEl = document.getElementById('map');
        var myLatlng = new google.maps.LatLng(47.37371,8.539753);
        var myOptions = {
            zoom: 16,
            center: myLatlng,
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            panControl: false,
            streetViewControl: false,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            }
        };
        areasMap = new google.maps.Map(mapEl, myOptions);

        loadData('map');

        // MAP EVENTS
        google.maps.event.addListener(areasMap, 'click', function() {
            closeInfoWindow();
            if ($('#map').hasClass('small')) {
                $('#map').removeClass('small');
                $('#image-wrapper').removeClass('active');
            }
        });

        setTimeout("startAnimations()", 3000);
    };
    // ------------------------------------------------------------------------------------------


    // FILTER MARKER ON MAP ----------------------------------------------------------------------
    function filterMarkers(filter, visible) {

        for (var i=0; i < markers.length; i++) {
            var marker = markers[i];
            var years = marker.years;

            switch (visible) {
                case "add":
                    if (years.indexOf(filter) === -1 ) marker.setVisible(false);
                    break;
                case "remove":
                    if (years.indexOf(filter) === -1 ) marker.setVisible(true);
                    //else marker.setVisible(false);
                    break;
                case "reset":
                    marker.setVisible(true);
            }
        }

        closeInfoWindow();
        fitMarkerBounds();
    }
    // ------------------------------------------------------------------------------------------

    // FIT MARKER TO BOUNDS ---------------------------------------------------------------------
    function fitMarkerBounds() {

        var markerBoundsFilter = new google.maps.LatLngBounds();
        var hasMarkers = false;

        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            var visible = marker.getVisible();
            if (visible) {
                markerBoundsFilter.extend(marker.position);
                hasMarkers = true;
            }
        }

        // show error msg if no markers are visible
        if (hasMarkers) {
            areasMap.fitBounds(markerBoundsFilter);
            hideError('filter');
        } else showError('filter');
    }
    // ------------------------------------------------------------------------------------------------

    // CLOSE ACTIVE INFOWINDOW ------------------------------------------------------------------------
    function closeInfoWindow() {

        $.each(activeInfoWindow, function(index, value){
            activeInfoWindow[index].close();
        });
    }
    // -------------------------------------------------------------------------------------------------

    // PLACE MARKERS ON MAP ---------------------------------------------------------------------------
    function placeMarkers() {
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            marker.setMap(areasMap);
        }

        areasMap.fitBounds(markerBounds);
    }
    // -------------------------------------------------------------------------------------------------

    // CREATE INFOWINDOW CONTENT (HTML) ----------------------------------------------------------------
    function createBubbleContent(skiareas) {

        var heading = "<h2>"+skiareas.name+"</h2>";
        var visits = "<p>Days visited: "+skiareas.visits+"</p>";
        var yearsList = "<p>Skidays: ";
        var yearsData = skiareas.years.split(',');
        var yearsLength = skiareas.years.split(',').length - 1;
        var imgLinkId;

        if (skiareas.imgId !== "") {
            imgLinkId = "<a href='#' class='img-load link big' title='View images' onclick='loadData(\"img\","+skiareas.imgId+");'></a>"
        }


         $.each(yearsData, function(index, value){
            yearsList += value+', ';
            if (index === yearsLength) yearsList += '</p>';
        });

        var content = {"heading": heading, "years": yearsList, "visits": visits, "imgLinkId": imgLinkId};
        return content;
    }
    // ---------------------------------------------------------------------------------------------------

    // CREATE MARKER & INFOWINDOW ------------------------------------------------------------------------
    function createMarker(skiareas) {
        var latlng = skiareas.geo.replace(" ", "");
        latlng = latlng.split(',');
        latlng = new google.maps.LatLng(latlng[0],latlng[1]);

        var image = new google.maps.MarkerImage(
            document.getElementById('marker-image').src,
            // This marker is 20 pixels wide by 32 pixels tall.
            new google.maps.Size(25, 25),
            // The origin for this image is 0,0.
            new google.maps.Point(0,0),
            // The anchor for this image is the base of the flagpole at 0,32.
            new google.maps.Point(13,25)
        );
        var shadow = new google.maps.MarkerImage(
            document.getElementById('marker-shadow').src,
            new google.maps.Size(41,25),
            new google.maps.Point(0,0),
            new google.maps.Point(13,25)
          );

        var shape = {
          coord: [0,0,25,25],
          type: 'rect'
        };

        var marker = new google.maps.Marker({
            position: latlng,
            title: skiareas.name,
            years: skiareas.years,
            icon: image,
            shadow: shadow,
            shape: shape,
            flat: false
        });

        var bubbleContent = createBubbleContent(skiareas);
        if (bubbleContent.imgLinkId) var bubbleHTML = bubbleContent.heading+bubbleContent.years+bubbleContent.visits+bubbleContent.imgLinkId;
        else var bubbleHTML = bubbleContent.heading+bubbleContent.years+bubbleContent.visits;

        var infoBubble = new InfoBubble({
           content: "<div class='bubble-content'>"+bubbleHTML+"</div>",
           backgroundColor:"#020C17",
           borderColor:"#018687",
           padding:20,
           borderRadius:5,
           shadowStyle: 1,
           minWidth: 150,
           maxWidth: 250,
           minHeight: 100,
           maxHeight:200,
           disableAutoPan: true,
           hideCloseButton: true
        });

        // add events for markers
        google.maps.event.addListener(marker, 'click', function() {
            if (!infoBubble.isOpen()) {
                infoBubble.open(areasMap, marker);
                activeInfoWindow[skiareas.id] = infoBubble;
                closeInfoWindow();
            } else {
                infoBubble.close();
                delete activeInfoWindow[skiareas.id];
            }
        });

        markerBounds.extend(latlng);
        markers.push(marker);
    }
    // -------------------------------------------------------------------------------------------

    // HANDLE RESULT ---------------------------------------------------------------------------
    function handleResult(type, data, id) {

        switch (type) {
            case "map":
                var skiareas = data;
                for (var i = 0; i < skiareas.length; i++) {
                    createMarker(skiareas[i]);
                }
                createFilters(skiareas);
                placeMarkers();
                break;

            case "img":
                var skiimages = data;
                for (var i = 0; i < skiimages.length; i++) {
                    if (skiimages[i].id == id) loadImages(skiimages[i]);
                }
                break;
        }
    };
    // ------------------------------------------------------------------------------------------

    // LOAD DATA ------------------------------------------------------------------------------------------
    loadData = function(type, id) {
        switch (type) {
            case "map":
                $.getJSON('data/skiareas.json', function(data) { handleResult("map", data);});
                break;
            case "img":
                $.getJSON('data/skiimages.json', function(data) { handleResult("img", data, id);});
                break;
        }

    };
    // -----------------------------------------------------------------------------------------------------

    // CREATE FILTER OPTIONS (HTML) ------------------------------------------------------------------------
    function createFilters(skiareas) {

        for (var i = 0; i < skiareas.length; i++) {

            var area = skiareas[i];

            // years
            $.each(area.years.split(','), function(index, value){
                if($.inArray(value, filters.years) === -1) filters.years.push(value);
            });

        }

        // YEARS
        filters.years.sort();
        var yearsHeading = document.createElement('h3');
            yearsHeading.innerHTML = "Select years: ";
        var yearsList = document.createElement('ul');
        var li = document.createElement('li');

        $.each(filters.years, function(index,value){
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = "#";
            a.innerHTML = value;
            li.appendChild(a);
            yearsList.appendChild(li);
        });


        var info = document.createElement('p');
            info.innerHTML = "This project is in beta, happy bug reporting.";

        $('#filter').append(info);
        $('#filter').append(yearsHeading);
        $('#filter').append(yearsList);

        initFilterBindings();

    }
    //---------------------------------------------------------------------------------------------------------

    // DISPLAY ERROR MSG --------------------------------------------------------------------------------------
    function showError(type) {

        switch (type) {
            case "filter":
                var container = document.getElementById('filter-error');
                container.innerHTML = "Filter does not match."
                break;
        }

        var reset = document.createElement('a');
        reset.href = "#";
        reset.innerHTML = " Reset!"
        container.appendChild(reset);
        document.body.appendChild(container);
        $('body').addClass(type+'-error');
    }
    // ------------------------------------------------------------------------------------------------------

    // HIDE ERROR MSG --------------------------------------------------------------------------------------
    function hideError(type) {
        $('body').removeClass(filter+'-error');
    }
    // ------------------------------------------------------------------------------------------------------

    // INIT BINDINGS FILTER & BUTTONS-------------------------------------------------------------------------
    function initFilterBindings() {

        // open menu
        $('nav a.btn').bind('click', function(){
            $('#image-wrapper').removeClass('active');
            $('#map').removeClass('small');
            var isActive = $(this).parents('nav').hasClass('active');
            if (isActive) $(this).parents('nav').removeClass('active');
            else $(this).parents('nav').addClass('active');
        });

        // activate filter
        $('#filter li > a').on('click', function(){
            var filter = $(this).html();
            var isActive = $(this).hasClass('active');
            $('#map').removeClass('small');
            $('#image-wrapper').removeClass('active');

            if (isActive) {
                $(this).removeClass('active');
                filterMarkers(filter, 'remove');
            } else {
                $(this).addClass('active');
                filterMarkers(filter, 'add');
            }
        });

        // handle click on error msg
        $('p.error').on('click', function(){
            $('body').removeClass('filter-error');
            $('#filter li > a').removeClass('active');
            filterMarkers('', 'reset');
        });

        $('#image-wrapper > a.btn').bind('click', function(){
            $('#image-wrapper').removeClass('active');
            $('#map').removeClass('small');
        });

    }
    // -------------------------------------------------------------------------------------------------

    // CREATE / ADD IMAGES-------------------------------------------------------------------------------------
    function createImage(imgSource) {

        var i = document.createElement('img');
        i.src = "data/skiimages/"+imgSource;
        var a = document.createElement('a');
        a.href = "#";
        a.className = "zoom";
        var l = document.createElement('li');

        a.appendChild(i);
        l.appendChild(a);
        $('#image-wrapper ul').append(l);

    }
    // --------------------------------------------------------------------------------------------------

    // LOAD IMAGES --------------------------------------------------------------------------------------
    function loadImages(obj) {
        $('#image-wrapper').addClass('active');
        $('#map').addClass('small');
        $('nav#filter').removeClass('active');

        $('#image-wrapper > [data-text="heading"]').text(obj.name);
        $('#image-wrapper ul li').remove();

        for (var i = 0; i < obj.images.length; i++) {
            var img = obj.images[i];
            createImage(img);
        }

        $('#image-wrapper ul').css('width', obj.images.length * 144 +'px');
        $('#image-wrapper ul > li').on('click', function(){zoomImage($(this))});

    }
    // --------------------------------------------------------------------------------------------------

    // ZOOM IMAGES --------------------------------------------------------------------------------------
    function zoomImage($li) {

        var $img = $li.find('img').clone();

        var $background = $('<div></div>', {'class':'zoom-background'});
        var $container = $('<div></div>', {'class':'zoom-wrapper'});
        var $wrapper = $('<div></div>', {'class':'img-wrapper'});
        var $closeBtn = $('<a href="#" class="btn">Close</a>');

        $img.attr('title', 'click to view next image');
        $img.appendTo($wrapper);
        $closeBtn.appendTo($container);
        $wrapper.appendTo($container);
        $container.appendTo('body');
        $background.appendTo('body');


        $closeBtn.bind('click', function(){
            $('.zoom-background, .zoom-wrapper').remove();
            //console.log(areasMap);
            //console.log(google.maps.event.trigger(areasMap, 'resize'));
        });

        nextImage($wrapper,$img,$li);

    }
    // --------------------------------------------------------------------------------------------------

    // IMAGE SWITCHER ------------------------------------------------------------------------------------
    function nextImage(wrapper, img, li) {

        var $li = li;
        var $img = img;
        var $wrapper = wrapper;

        $img.click(function(){

            // check for last img
            if ($li.is(':last-child')) var $next = $li.parent().find('li:first-child');
            else var $next = $li.next();

            // clone new img
            var $newimg = $next.find('img').clone();

            // fade from old to new
            $(this).fadeOut(100).remove();
            $newimg.hide().appendTo($wrapper).fadeIn(100);

            // call function with new elements again
            nextImage($wrapper,$newimg, $next);

        });
    }
    // --------------------------------------------------------------------------------------------------

    // BOOOOOOOOOOOOOOOMMMMM ----------------------------------------------------------------------------
    initMap();
    // --------------------------------------------------------------------------------------------------
});