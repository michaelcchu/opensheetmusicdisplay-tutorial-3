const audioContext = new AudioContext();
const badKeys = ["Alt","Arrow","Audio","Enter","Launch","Meta","Play","Tab"];
const gainNode = new GainNode(audioContext);
const oscillator = new OscillatorNode(audioContext, {frequency: 0});

const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container);
let loadPromise; let parts; let cursor; let on = false; 
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

function toFreq(note) {
    return tuning.frequency * 2**((note.pitch - tuning.pitch)/12 
        + note.octave - tuning.octave)
}
document.addEventListener("keydown", () => {
    if (cursor) {
        cursor.next();
        const pitch = cursor.NotesUnderCursor()[0].pitch;
        if (pitch) {
            const note = {
                pitch: pitch.fundamentalNote + pitch.AccidentalHalfTones, 
                octave: pitch.octave + 3,
            }
            oscillator.frequency.value = toFreq(note);
            gainNode.gain.setTargetAtTime(normalGain, 
                audioContext.currentTime, 0.015);
        }

    }
});
