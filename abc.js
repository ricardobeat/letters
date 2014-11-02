;(function () {

    var $                = window.Rye
    var _                = Rye.require('Util')
    var EventEmitter     = Rye.require('Events').EventEmitter
    var lastSay          = 0
    var letter           = $('.letter')
    var languageSettings = $('.settings-language')
    var languageSelect   = $('#language-selector')
    var currentLanguage  = languageSettings.find('.current')
    var AUDIO_OFF        = 'audio off'
    var lastWord

    // Fallbacks
    var SpeechSynthesisUtterance = _.prefix('SpeechSynthesisUtterance')
    var speechSynthesis          = _.prefix('speechSynthesis')
    var RequestFullscreen        = _.prefix('RequestFullscreen', document.documentElement) || function () {}
    var exitFullScreen           = _.prefix('exitFullscreen', document) || function () {}
    var hasSpeech                = speechSynthesis && SpeechSynthesisUtterance;

    // Settings
    // ------------------------------------------------------------------------

    function Settings () {
        EventEmitter.call(this)
        this.lang = (
            navigator.languages && navigator.languages[0]
            || navigator.language
            || 'en'
        )
        this.audio = true
    }
    _.inherits(Settings, EventEmitter)

    Settings.prototype.set = function (key, value, persist) {
        this[key] = value
        try {
            if (persist !== false) localStorage['abc-' + key] = value
        } catch (e) {}
        this.emit('change:' + key, value)
    }

    Settings.prototype.init = function (key, value) {
        var self = this
        try {
            ;['lang', 'audio'].forEach(function (key) {
                var value = localStorage['abc-' + key]
                if (value != undefined) {
                    self.set(key, value == 'false' ? false : value, false)
                }
            })
        } catch (e) {}
        this.render()
    }

    Settings.prototype.render = function () {
        ga('send', 'event', 'game', 'language changed', this.lang);
        currentLanguage.text(this.audio ? this.lang.toLowerCase() : AUDIO_OFF)
    }

    var settings = new Settings()

    settings.on('change:lang', settings.render)
    settings.on('change:audio', settings.render)

    // Display
    // ------------------------------------------------------------------------

    function showLetter (char) {
        var color = '#' +  (Math.random() * 16581375).toString(16).slice(0,6)
        letter.text(char.toUpperCase()).css({ color: color })
        say(char)
    }

    var debounce = 0
    function showRandomLetter (e) {
        var now = Date.now()
        if (now - debounce < 600) return
        debounce = now
        ga('send', 'event', 'actions', 'random');
        var randomLetter = Math.floor(65 + Math.random() * 26)
        showLetter(String.fromCharCode(randomLetter))
    }


    // TTS
    // ------------------------------------------------------------------------

    function say (word) {
        if (!hasSpeech || settings.audio === false || (word === lastWord && Date.now() - lastSay < 600)) return
        speechSynthesis.cancel()
        var msg = new SpeechSynthesisUtterance(word.toLowerCase())
        msg.lang = settings.lang
        speechSynthesis.speak(msg)
        lastSay = Date.now()
        lastWord = word
    }

    // Language options for speech synthesis
    function createLanguageOptions () {
        var availableLanguages = _.unique(_.pluck(speechSynthesis.getVoices(), 'lang')).sort()
        availableLanguages.push(AUDIO_OFF)

        languageSelect.empty()
        _.each(availableLanguages, function (lang) {
            lang = lang
            languageSelect.append($.create('<option>').attr({ value: lang, selected: lang === settings.lang }).text(lang.toLowerCase()))
        })

        languageSettings.removeClass('hidden')

        languageSelect.on('change', function (e) {
            var value = e.target.value
            if (value === AUDIO_OFF) {
                settings.set('audio', false)
            } else {
                settings.set('audio', true)
                settings.set('lang', value)
            }
            languageSelect.get(0).blur()
        })
    }

    // App
    // ------------------------------------------------------------------------

    function showIntro () {
        var intro = $.create('<p>').addClass('intro').text(
            /pt/.test(settings.lang)
                ? "Aperte uma tecla..."
                : "Press any key..."
        )
        $(document.body).append(intro)
    }

    function hideIntro () {
        $('.intro').remove()
    }

    function setupEvents () {
        $(document).on('keypress', function(e){
            ga('send', 'event', 'actions', 'keypress');
            showLetter(String.fromCharCode(e.keyCode))
        })

        letter.on({
            mousedown: showRandomLetter,
            touchstart: showRandomLetter
        })

        var fullScreen = false

        $('#full-screen').on('click', function (e) {
            if (fullScreen) {
                exitFullScreen.call(document)
            } else {
                ga('send', 'event', 'game', 'fullscreen');
                RequestFullscreen.call(document.documentElement)
            }
        })

        $(document).on('webkitfullscreenchange', function () {
            fullScreen = !!_.prefix('isFullScreen', document)
        });

        $(document).once('keydown', hideIntro)
        $(document).once('mousedown', hideIntro)
        $(document).once('touchstart', hideIntro)

    }

    /* Initialize */
    function init () {
        settings.init()
        
        // Audio
        createLanguageOptions()
        if (hasSpeech) {
            speechSynthesis.onvoiceschanged = createLanguageOptions   
        } else {
            settings.set('audio', false)
        }

        setupEvents()
        showIntro()
    }

    init()

})();
