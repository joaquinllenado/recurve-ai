import { useState, useCallback, useRef } from "react";
import { postProduct, transcribeAudio } from "../api/client";
import { extractTranscript } from "../utils/transcript";

const MAX_LENGTH = 10_000;

export function ProductInput() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleSubmit = useCallback(async () => {
    const text = description.trim();
    if (!text) return;
    setError(null);
    setLoading(true);
    try {
      await postProduct(text);
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }, [description]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setLoading(true);
        try {
          const result = await transcribeAudio(blob);
          const transcript = extractTranscript(result);
          if (transcript) {
            setDescription((prev) => {
              const combined = prev ? `${prev}\n${transcript}` : transcript;
              return combined.slice(0, MAX_LENGTH);
            });
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setLoading(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access microphone");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Describe your product..."
          className="flex-1 min-h-[80px] px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          disabled={loading}
          rows={3}
        />
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          className={`shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
            recording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          }`}
          title={recording ? "Stop recording" : "Record with microphone"}
        >
          {recording ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Stop
            </span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {description.length} / {MAX_LENGTH}
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !description.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Processing..." : "Generate Strategy"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
