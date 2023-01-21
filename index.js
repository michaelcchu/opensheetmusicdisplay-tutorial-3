const audioContext = new AudioContext();
const badKeys = ["Alt","Arrow","Audio","Enter","Launch","Meta","Play","Tab"];
const gainNode = new GainNode(audioContext);
const oscillator = new OscillatorNode(audioContext, {frequency: 0});

const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container);
let loadPromise; let parts; let press; let cursor; 

let activePress = null; let on = false; let paused = false;
const normalGain = 0.15;

oscillator.connect(gainNode).connect(audioContext.destination);
gainNode.gain.value = 0;

function render() {
    const track = select.selectedIndex;
    for (let i = 0; i < parts.length; i++) {
        osmd.sheet.Instruments[i].Visible = (i === track);
    }
    loadPromise.then(() => {
        osmd.render();
        cursor = osmd.cursor;
        osmd.FollowCursor = true;
        cursor.show();
    });
}

input.addEventListener("change", () => {
    for (const file of input.files) {
        const reader = new FileReader();
        reader.addEventListener("load", (e) => {
             const text = e.target.result
             const parser = new DOMParser();
             const mxlDoc = parser.parseFromString(text,'text/xml');
             console.log(mxlDoc);
             loadPromise = osmd.load(mxlDoc);             
             parts = mxlDoc.querySelectorAll("part");

             while (select.options.length) {select.options.remove(0);}
             for (let i = 0; i < parts.length; i++) {
                 const option = document.createElement("option");
                 option.text = parts[i].id; select.add(option);
             }

             render();

             if (!on) {oscillator.start(); on = true;}
        });
        reader.readAsText(file);
    }
});

select.addEventListener("change", render);

const tuning = {
    pitch: 9, 
    octave: 4, 
    frequency: 440
};

function key(e) { 
    if (e.type.includes("key")) {press = e.key;} 
    else {press = e.changedTouches[0].identifier;}
    if (["keydown","touchstart"].includes(e.type)) {down(e);} else {up();}
}

function down(e) {
    const strPress = "" + press;
    if (on && !badKeys.some(badKey => strPress.includes(badKey)) && !paused
        && !e.repeat && (document.activeElement.nodeName !== 'INPUT') 
        && (press != activePress) && cursor && cursor.next()) {
            const pitch = cursor.NotesUnderCursor()[0].pitch;
            if (pitch) {
                const note = {
                    pitch: pitch.fundamentalNote + pitch.AccidentalHalfTones, 
                    octave: pitch.octave + 3,
                }
                const freq = toFreq(note);
                if (activePress === null) {
                    oscillator.frequency.value = freq;
                    gainNode.gain.setTargetAtTime(normalGain, 
                        audioContext.currentTime, 0.015);
                } else {
                    oscillator.frequency.setTargetAtTime(freq, 
                        audioContext.currentTime, 0.003)   
                }
                activePress = press;
            }
    } else if (strPress.includes("Arrow") && (activePress === null)) {
        if (strPress.includes("Left")) {cursor.previous();}
        else if (strPress.includes("Right")) {cursor.next();}
    }
}

function up() {
    if (on && (press === activePress)) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.015);
        activePress = null; 
    }
}

function toFreq(note) {
    return tuning.frequency * 2**((note.pitch - tuning.pitch)/12 
        + note.octave - tuning.octave)
}

const docEventTypes = ["keydown","keyup","touchstart","touchend"];
for (et of docEventTypes) {document.addEventListener(et, key);}