"""
Extract simple visual features from a video file.

This module currently computes very lightweight, generic metrics that are
useful for demoing the analysis pipeline:
- frame_count: total number of frames
- avg_brightness: average grayscale brightness across all frames
- motion_score: average amount of frame-to-frame motion

Later this can be extended with MediaPipe-based facial / gesture metrics.
"""

from typing import Dict

import cv2


def extract_features(video_path: str) -> Dict[str, float]:
    """
    Extract simple features from the given video file.

    Returns an empty dict if the video cannot be opened.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {}

    frame_count = 0
    total_brightness = 0.0
    motion_acc = 0.0
    prev_gray = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        total_brightness += float(gray.mean())

        if prev_gray is not None:
            diff = cv2.absdiff(gray, prev_gray)
            motion_acc += float(diff.mean())

        prev_gray = gray

    cap.release()

    if frame_count == 0:
        return {}

    avg_brightness = total_brightness / frame_count
    motion_score = motion_acc / max(1, frame_count - 1)

    return {
        "frame_count": float(frame_count),
        "avg_brightness": float(avg_brightness),
        "motion_score": float(motion_score),
    }


