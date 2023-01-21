const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container);
let loadPromise; let parts; let cursor;


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
        });
        reader.readAsText(file);
    }
});

select.addEventListener("change", render);

document.addEventListener("keydown", () => {
    if (cursor) {cursor.next();}
});
