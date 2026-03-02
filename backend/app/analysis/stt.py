"""
Speech-to-text (STT) helpers.

At this stage we only return a dummy transcript instead of calling a
real STT service. Later, Whisper or another provider can be integrated
without changing the public function signature.
"""

from typing import Optional, Tuple


def get_transcript(interview_id: int) -> Tuple[str, Optional[int]]:
    """
    Return a dummy transcript and optional duration for the interview.

    In the real implementation:
    - Resolve the video file path using interview_id
    - Extract audio from the video and send it to the STT service
    - Compute transcript text and duration
    """
    text = (
        "This is a dummy transcript used to exercise the analysis "
        "pipeline end to end. In the real system this will contain the "
        "candidate's actual spoken answer."
    )
    duration_seconds: Optional[int] = None
    return text, duration_seconds

