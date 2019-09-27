
class WindowMessager {
    constructor (window) {
        this.window = window
        this.waitings = {}
        this.windows = {}
        this.listeners = {}
        
        this.window.addEventListener('message', this.onMessage)
        this.addListener('ready', this.onReady)
    }

    addWindow(window, name) {
        if (!window || !name) { return }
        this.waitings[name] = window

        return new Promise(function (resolve, reject) {
            var retry = 30
            var it = setInterval(function(){
                if (!this.waitings[name]) {
                    resolve()
                    clearInterval(it)
                } else if (retry === 0) {
                    reject()
                } else {
                    retry = retry - 1
                    this.newMessage('ready', null, this.waitings[name]).send()
                }
            }.bind(this), 30)
        }.bind(this))
    }

    addListener(event, handler) {
        this.listeners[event] = handler
    }

    newMessage(event, data, to) {
        if (typeof to === 'string') {
            to = this.listeners[to]
        }
        return new Message(this.window, event, data, to)
    }

    onMessage (e) {
        var from = e.source
        var to = this.window
        var payload = e.data
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload)
            } catch (e) {}
        }
        var message = new Message(from, payload.event, payload.data, to)
        if (this.listeners[message.event]) {
            this.listeners[message.event](message)
        }
    }

    onReady (message) {
        var window = message.from
        var waitings = Object.keys(this.waitings)
        for (let i = 0; i < waitings.length; i++) {
            var key = waitings[i]
            if (this.waitings[key] === window) {
                delete this.waitings[key]
                this.windows[key] = window
            }
        }
    }
}

class Message {
    constructor (from, event, data, to) {
        this.from = from
        this.event = event
        this.data = data
        this.to = to
    }

    send () {
        this.to.postMessage(JSON.stringify({
            event: this.event,
            data: this.data
        }), '*')
    }
}

module.exports = WindowMessager;