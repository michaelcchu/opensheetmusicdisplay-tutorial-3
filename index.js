const audioContext = new AudioContext();
const badKeys = ["Alt","Arrow","Audio","Enter","Launch","Meta","Play","Tab"];
const gainNode = new GainNode(audioContext);
const oscillator = new OscillatorNode(audioContext, {frequency: 0});
const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container);
const value = {"c":0,"d":2,"e":4,"f":5,"g":7,"a":9,"b":11,"#":1,"&":-1};

let activePress; let loadPromise; let on = false; let parts; let paused; 
let press; let track; let tuning;

oscillator.connect(gainNode).connect(audioContext.destination);
osmd.FollowCursor = true;

function down(e) {
    const strPress = "" + press;
    if (on && !badKeys.some(badKey => strPress.includes(badKey)) && !paused
        && !e.repeat && (document.activeElement.nodeName !== 'INPUT') 
        && (press != activePress) && (osmd.cursor !== null)) {
            osmd.cursor.next()
            const cursorNotes = osmd.cursor.NotesUnderCursor();
            if (cursorNotes[0]) {
                const pitch = cursorNotes[0].pitch;
                if (pitch) {
                    const note = {
                        pitch: pitch.fundamentalNote 
                            + pitch.AccidentalHalfTones, 
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
            }
    } else if (strPress.includes("Arrow") && (activePress === null)) {
        if (strPress.includes("Left")) {osmd.cursor.previous();}
        else if (strPress.includes("Right")) {osmd.cursor.next();}
    }
}

function format(x) {return x.trim().toLowerCase();}

function key(e) { 
    if (e.type.includes("key")) {press = e.key;} 
    else {press = e.changedTouches[0].identifier;}
    if (["keydown","touchstart"].includes(e.type)) {down(e);} else {up();}
}

function parse() {
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
}

function render() {
    resetVars();
    for (let i = 0; i < parts.length; i++) {
        osmd.sheet.Instruments[i].Visible = (i === track);
    }
    loadPromise.then(() => {
        osmd.render();
        //osmd.cursor.reset();
        osmd.cursor.show();
    });
}

function resetVars() {
    activePress = null; paused = false;
    tuning = unbundle(tuningNote.value);
    tuning.frequency = +tuningFrequency.value;
    track = select.selectedIndex;
    const proposedGain = +gain.value;
    if (proposedGain <= 1 && proposedGain >= 0) {normalGain = proposedGain;} 
    else {normalGain = 0.15;}
    gainNode.gain.value = 0;
}

function toFreq(note) {
    return tuning.frequency * 2**((note.pitch - tuning.pitch)/12 
        + note.octave - tuning.octave)
}

function unbundle(note) {
    let text = format(note); note = text.split('');
    if (+note.at(-1)) {octave = +note.pop();} else {text += octave;}
    let pitch = 0; while (note.length) { pitch += value[note.pop()]; }
    return {pitch:pitch, octave:octave, text:text};
}

function up() {
    if (on && (press === activePress)) {
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.015);
        activePress = null; 
    }
}

input.addEventListener("change", parse);
select.addEventListener("change", render);

const docEventTypes = ["keydown","keyup","touchstart","touchend"];
for (et of docEventTypes) {document.addEventListener(et, key);}