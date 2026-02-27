import os

import httpx
from fastapi import UploadFile

MODULATE_API_URL = "https://modulate-developer-apis.com/api/velma-2-stt-batch"
MODULATE_API_KEY = os.getenv("MODULATE_API_KEY")


async def transcribe_audio(
    file: UploadFile,
    *,
    speaker_diarization: bool = True,
    emotion_signal: bool = True,
) -> dict:
    """Send an audio file to the Modulate Velma-2 STT API and return the parsed response."""
    contents = await file.read()

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            MODULATE_API_URL,
            headers={"X-API-Key": MODULATE_API_KEY},
            files={"upload_file": (file.filename, contents, file.content_type)},
            data={
                "speaker_diarization": str(speaker_diarization).lower(),
                "emotion_signal": str(emotion_signal).lower(),
            },
        )
        response.raise_for_status()

    return response.json()
