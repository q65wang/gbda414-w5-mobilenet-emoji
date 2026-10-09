let video; // Live webcam video.
let classifier; // ml5.js MobileNet classifier.
let mappings = []; // Records loaded from the JSON file.
let currentLabel = "Waiting for classification..."; // Latest model label.
let currentConfidence = 0; // Confidence from 0 to 1.
let currentRecord = null; // Matching JSON record, if found.
let jsonLoaded = false; // Whether JSON loading succeeded.
let jsonError = false; // Whether JSON loading failed.
let topPredictions = []; // Array to store the top 3 predictions

function preload() {
  // p5 waits for the dataset before setup().
  mappings = loadJSON(
    "finalImageNetLabelsAndEmojis.json",
    jsonLoadedSuccessfully,
    jsonFailedToLoad,
  );
}

function jsonLoadedSuccessfully(data) {
  // Store the loaded records.
  mappings = data;
  jsonLoaded = true;
}

function jsonFailedToLoad(error) {
  // An empty array allows the interface to show failure without crashing.
  console.error("Could not load JSON dataset:", error);
  jsonError = true;
  mappings = [];
}

function setup() {
  createCanvas(960, 950);
  video = createCapture(VIDEO, { flipped: true });
  video.size(320, 240);
  video.hide();
  classifier = ml5.imageClassifier("MobileNet", { flipped: true });
  classifier.classifyStart(video, gotResults);
}

function normalizeLabel(labelText) {
  // Lowercase and trim a label so comparisons are less sensitive to formatting.
  return String(labelText).toLowerCase().trim();
}

function firstTerm(labelText) {
  // Keep the first term from a comma-separated synonym list.
  return normalizeLabel(labelText).split(",")[0].trim();
}

function labelTerms(labelText) {
  // Turn a comma-separated label into clean, searchable terms.
  return normalizeLabel(labelText)
    .split(",")
    .map(function (term) {
      return term.trim();
    })
    .filter(function (term) {
      return term.length > 0;
    });
}

function findMapping(modelLabel) {
  // Do not search until the JSON has loaded.
  if (!jsonLoaded || !Array.isArray(mappings)) return null;
  let modelFull = normalizeLabel(modelLabel);
  let modelFirst = firstTerm(modelLabel);
  let modelTerms = labelTerms(modelLabel);

  // PASS 1: exact full-label match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFull === normalizeLabel(item.label)) return item;
  }

  // PASS 2: first-term match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFirst === firstTerm(item.label)) return item;
  }

  // PASS 3: exact synonym-term match.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm === datasetTerm) return item;
      }
    }
  }

  // PASS 4: containment match, restricted to terms of four or more characters.
  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm.length < 4 || datasetTerm.length < 4) continue;
        if (modelTerm.includes(datasetTerm) || datasetTerm.includes(modelTerm))
          return item;
      }
    }
  }
  console.log("No mapping found for:", modelLabel);
  return null;
}

function gotResults(results) {
  // Store the latest prediction and search the JSON for its translation.
  if (!results || results.length === 0) return;

  //New code to store the top 3 predictions
  topPredictions = results.slice(0, 3);

  currentLabel = results[0].label;
  currentConfidence = results[0].confidence;
  currentRecord = findMapping(currentLabel);
  // console.log("MobileNet label:", currentLabel);
  // console.log("Confidence:", currentConfidence);
  // console.log("Matching record:", currentRecord);
}

function draw() {
  background(255); // Clear the canvas each frame to prevent overlapping Top 3 text

  // Draw the webcam and then the information panel.
  image(video, 0, 0, 960, 720);
  fill(0, 190);
  noStroke();
  rect(20, 20, 820, 300, 12);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("STEP 4: MATCH THE MOBILENET LABEL", 40, 42);
  text("Model label: " + currentLabel, 40, 82);
  text("Confidence: " + nf(currentConfidence * 100, 2, 1) + "%", 40, 115);
  if (jsonError) {
    fill(255, 100, 100);
    text("JSON: could not be loaded.", 40, 155);
  } else if (!jsonLoaded) {
    fill(255, 220, 120);
    text("JSON: still loading...", 40, 155);
  } else {
    fill(180, 255, 180);
    text("JSON records loaded: " + mappings.length, 40, 155);
    fill(255);
    if (currentRecord) {
      text("Workshop category: " + currentRecord.workshopCategory, 40, 205);
      text("Emoji: " + currentRecord.emoji, 40, 245);
      text("Match source: " + currentRecord.label, 40, 280);
    } else {
      fill(255, 150, 150);
      text("No matching JSON record found.", 40, 205);
      text("Emoji: ❓", 40, 245);
    }
  }
  // Top 3 predictions
  noStroke();

  // Clear the prediction area every frame
  fill(30, 30, 30);
  rect(0, 720, 960, 230);

  // Title
  fill(255);
  textAlign(LEFT, TOP);
  textSize(22);
  text("TOP 3 PREDICTIONS", 40, 740);

  //Preedicitions colors: Green for 1st, Yellow for 2nd, Red for 3rd
  let colors = [
    [166, 230, 126], // Green
    [245, 277, 66], // Yellow
    [212, 66, 66], // Red
  ];

  //Repeat for every prediction
  for (let i = 0; i < topPredictions.length; i++) {
    fill(...colors[i]);
    textSize(20);

    //Get onject label and confidence
    let label = topPredictions[i].label;
    let confidence = topPredictions[i].confidence;

    //display the prediction with its rank, label, and confidence percentage
    text(
      i + 1 + ". " + label + " - " + (confidence * 100).toFixed(1) + "%",
      40,
      800 + i * 45,
    );
  }
}
