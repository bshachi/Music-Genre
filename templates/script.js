const recordButton = document.getElementById('recordButton');
const statusElement = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const audioFileInput = document.getElementById('audioFileInput');
const errorMessage = document.getElementById('errorMessage');
const getGenButton = document.getElementById('getGenButton');
const generatedTextElement = document.getElementById('generatedText');

let mediaRecorder;
let chunks = [];
let isRecording = false;
let recordedBlob; // To store the recorded audio blob

const handleSuccess = (stream) => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            chunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: 'audio/wav' });
        chunks = [];

        const audioURL = URL.createObjectURL(recordedBlob);
        audioPlayer.src = audioURL;
        audioPlayer.style.display = 'block';

        statusElement.textContent = 'Status: Recording Stopped';
        recordButton.textContent = 'Record Again';
        isRecording = false;
        audioFileInput.disabled = false;
        getGenButton.style.display = 'block';
        generatedTextElement.textContent = ''; // Clear the generated text
    };

    recordButton.addEventListener('click', () => {
        if (!isRecording) {
            if (!stream.active) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => {
                        handleSuccess(stream);
                        mediaRecorder.start();
                        statusElement.textContent = 'Status: Recording';
                        recordButton.textContent = 'Stop Recording';
                        isRecording = true;
                        audioFileInput.disabled = true;
                        errorMessage.style.display = 'none';
                        getGenButton.style.display = 'none';
                        generatedTextElement.textContent = ''; // Clear the generated text
                    })
                    .catch((err) => {
                        console.error('Error accessing the microphone:', err);
                        errorMessage.style.display = 'block';
                        recordButton.disabled = true;
                    });
            } else {
                mediaRecorder.start();
                statusElement.textContent = 'Status: Recording';
                recordButton.textContent = 'Stop Recording';
                isRecording = true;
                audioFileInput.disabled = true;
                errorMessage.style.display = 'none';
                getGenButton.style.display = 'none';
                generatedTextElement.textContent = ''; // Clear the generated text
            }
        } else {
            mediaRecorder.stop();
            statusElement.textContent = 'Status: Stopping...';
            recordButton.disabled = true;
        }
    });

    getGenButton.addEventListener('click', () => {
        if (recordedBlob) {
            // Convert the recorded audio to MP3 using ffmpeg.js
            convertToMP3(recordedBlob)
                .then((mp3Blob) => {
                    // Pass the MP3 blob to the Flask app
                    sendToApp(mp3Blob);
                })
                .catch((error) => {
                    console.error('Error converting to MP3:', error);
                });
        }
    });
};

audioFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const audioURL = URL.createObjectURL(file);
    audioPlayer.src = audioURL;
    audioPlayer.style.display = 'block';
    statusElement.textContent = 'Status: File Loaded';
    getGenButton.style.display = 'block';
    generatedTextElement.textContent = ''; // Clear the generated text
});

navigator.mediaDevices.getUserMedia({ audio: true })
    .then(handleSuccess)
    .catch((err) => {
        console.error('Error accessing the microphone:', err);
        errorMessage.style.display = 'block';
        recordButton.disabled = true;
    });

// Function to convert the recorded audio to MP3 using ffmpeg.js
const convertToMP3 = async (audioBlob) => {
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    ffmpeg.FS('writeFile', 'audio.wav', await fetchFile(audioBlob));
    await ffmpeg.run('-i', 'audio.wav', 'audio.mp3');
    const mp3Data = ffmpeg.FS('readFile', 'audio.mp3');
    const mp3Blob = new Blob([mp3Data.buffer], { type: 'audio/mp3' });
    return mp3Blob;
};

// Function to send the MP3 blob to the Flask app
const sendToApp = (mp3Blob) => {
    const formData = new FormData();
    formData.append('audio_file', mp3Blob, 'audio.mp3');
    fetch('/generate', {
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            var genre = predict(data['features']);
            generatedTextElement.textContent = genre; 
        })
        .catch((error) => {
            console.error('Error fetching generated text:', error);
        });
};

tf.loadLayersModel('model / model.json')
    .then(function (model) {
        window.model = model;
    });
  
// Predict function
var predict = function (input) {
    var mapping = ['Reggae', 'Disco', 'Jazz', 'Classical', 'Rock', 'Classical', 'Hiphop', 'Blues', 'Pop', 'Country', 'Metal'];
    if (window.model) {
        window.model.predict([tf.tensor(input)])
            .array().then(function (scores) {
                scores = scores[0];
                var predicted = mapping[scores.indexOf(Math.max(...scores))];
                return predicted;
            });
    } else {

        setTimeout(function () { predict(input) }, 50);
    }
};


// Function to fetch file from Blob object
const fetchFile = async (blob) => {
    return new Uint8Array(await blob.arrayBuffer());
};
