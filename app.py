from flask import Flask, request, jsonify
import librosa
import math
import mutagen

app = Flask(__name__)

@app.route('/generate', methods=['POST'])

def process_input(audio_file, track_duration):

  SAMPLE_RATE = 22050
  NUM_MFCC = 13
  N_FTT=2048
  HOP_LENGTH=512
  TRACK_DURATION = track_duration # measured in seconds
  SAMPLES_PER_TRACK = SAMPLE_RATE * TRACK_DURATION
  NUM_SEGMENTS = 10

  samples_per_segment = int(SAMPLES_PER_TRACK / NUM_SEGMENTS)
  num_mfcc_vectors_per_segment = math.ceil(samples_per_segment / HOP_LENGTH)

  signal, sample_rate = librosa.load(audio_file, sr=SAMPLE_RATE)
  
  for d in range(10):

    # calculate start and finish sample for current segment
    start = samples_per_segment * d
    finish = start + samples_per_segment

    # extract mfcc
    mfcc = librosa.feature.mfcc(signal[start:finish], sample_rate, n_mfcc=NUM_MFCC, n_fft=N_FTT, hop_length=HOP_LENGTH)
    mfcc = mfcc.T

    return mfcc
  

def generate():
    audio = request.get_data()

    audio_info = mutagen.wave.WAVE(audio)
    audio_info = audio_info.info
    length = int(audio_info.length)

    #mapping = ['Reggae','Disco','Jazz','Classical','Rock','Classical','Hiphop','Blues','Pop','Country','Metal']


    input_mfcc = process_input(audio, length)
    #return jsonify(input_mfcc)
    return jsonify({'text': 'Hello World!'})

if __name__ == '__main__':
    app.run(debug=True)
