# How to Monitor Subtitle and Caption Generation Pipeline Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Subtitles, Captions, Speech-to-Text

Description: Monitor subtitle and caption generation pipeline performance from speech recognition to delivery using OpenTelemetry tracing.

Automated subtitle and caption generation has become essential for video platforms. Accessibility requirements, SEO benefits, and viewer preferences all drive the need for accurate, timely captions. The pipeline typically involves speech-to-text transcription, text processing, timing alignment, translation, and format conversion. Each step has its own performance characteristics and failure modes that need monitoring.

## The Caption Generation Pipeline

A typical pipeline flows like this:

1. Audio extraction from the video file
2. Speech-to-text transcription (ASR)
3. Punctuation and formatting correction
4. Sentence segmentation and timing alignment
5. Optional translation to other languages
6. Format conversion (SRT, VTT, TTML)
7. Quality validation
8. Delivery to CDN alongside the video

## Setting Up Instrumentation

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("caption.pipeline", "1.0.0")
meter = metrics.get_meter("caption.metrics", "1.0.0")

# Pipeline-level metrics
pipeline_duration = meter.create_histogram(
    name="caption.pipeline.duration",
    description="Total time to generate captions for a video",
    unit="s",
)

# Per-stage metrics
stage_duration = meter.create_histogram(
    name="caption.stage.duration",
    description="Duration of each caption generation stage",
    unit="s",
)

# Transcription-specific metrics
transcription_rtf = meter.create_histogram(
    name="caption.transcription.real_time_factor",
    description="Ratio of transcription time to audio duration (lower is better)",
)

word_count = meter.create_histogram(
    name="caption.transcription.word_count",
    description="Number of words transcribed per video",
)

# Translation metrics
translation_latency = meter.create_histogram(
    name="caption.translation.latency",
    description="Time to translate captions to one target language",
    unit="s",
)

# Quality metrics
confidence_score = meter.create_histogram(
    name="caption.transcription.confidence",
    description="Average confidence score from the ASR engine",
)

caption_jobs_completed = meter.create_counter(
    name="caption.jobs.completed",
    description="Number of caption generation jobs completed",
)

caption_jobs_failed = meter.create_counter(
    name="caption.jobs.failed",
    description="Number of caption generation jobs that failed",
)
```

## Instrumenting the Full Pipeline

```python
def generate_captions(video_id, video_path, target_languages=None):
    """Run the full caption generation pipeline."""
    with tracer.start_as_current_span("caption.pipeline") as span:
        pipeline_start = time.time()

        span.set_attribute("video.id", video_id)
        span.set_attribute("target_languages", str(target_languages or ["en"]))

        common_attrs = {"video_id": video_id}

        try:
            # Stage 1: Extract audio from video
            with tracer.start_as_current_span("caption.extract_audio") as audio_span:
                stage_start = time.time()

                audio_path, audio_info = extract_audio(video_path)
                audio_span.set_attribute("audio.duration_s", audio_info.duration)
                audio_span.set_attribute("audio.sample_rate", audio_info.sample_rate)
                audio_span.set_attribute("audio.channels", audio_info.channels)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "extract_audio"},
                )

            # Stage 2: Speech-to-text transcription
            with tracer.start_as_current_span("caption.transcribe") as asr_span:
                stage_start = time.time()

                asr_result = transcribe_audio(audio_path)

                transcription_time = time.time() - stage_start
                rtf = transcription_time / audio_info.duration
                transcription_rtf.record(rtf, common_attrs)

                asr_span.set_attribute("asr.model", asr_result.model_name)
                asr_span.set_attribute("asr.word_count", len(asr_result.words))
                asr_span.set_attribute("asr.avg_confidence", asr_result.avg_confidence)
                asr_span.set_attribute("asr.language_detected", asr_result.language)
                asr_span.set_attribute("asr.real_time_factor", rtf)

                word_count.record(len(asr_result.words), common_attrs)
                confidence_score.record(asr_result.avg_confidence, common_attrs)

                stage_duration.record(
                    transcription_time,
                    {**common_attrs, "stage": "transcribe"},
                )

            # Stage 3: Text post-processing
            with tracer.start_as_current_span("caption.post_process") as pp_span:
                stage_start = time.time()

                # Add punctuation if the ASR model did not provide it
                processed_text = add_punctuation(asr_result)
                pp_span.set_attribute("punctuation.corrections", processed_text.corrections)

                # Fix common ASR errors using a domain-specific dictionary
                corrected = apply_corrections(processed_text, video_id)
                pp_span.set_attribute("corrections.applied", corrected.correction_count)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "post_process"},
                )

            # Stage 4: Segment and align timing
            with tracer.start_as_current_span("caption.segment_align") as seg_span:
                stage_start = time.time()

                segments = segment_into_captions(corrected, max_chars_per_line=42,
                    max_lines=2, min_duration=1.0, max_duration=7.0)
                seg_span.set_attribute("segments.count", len(segments))

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "segment_align"},
                )

            # Stage 5: Translation (if requested)
            translations = {}
            if target_languages:
                for lang in target_languages:
                    with tracer.start_as_current_span(
                        f"caption.translate.{lang}"
                    ) as trans_span:
                        trans_start = time.time()

                        translated = translate_segments(segments, lang)
                        trans_span.set_attribute("target_language", lang)
                        trans_span.set_attribute("segment_count", len(translated))

                        trans_elapsed = time.time() - trans_start
                        translation_latency.record(trans_elapsed, {
                            **common_attrs, "target_language": lang,
                        })
                        translations[lang] = translated

            # Stage 6: Format conversion
            output_files = {}
            formats = ["srt", "vtt", "ttml"]

            with tracer.start_as_current_span("caption.format_convert") as fmt_span:
                stage_start = time.time()

                # Convert source language
                for fmt in formats:
                    output = convert_to_format(segments, fmt)
                    output_files[f"{asr_result.language}.{fmt}"] = output

                # Convert translations
                for lang, translated_segments in translations.items():
                    for fmt in formats:
                        output = convert_to_format(translated_segments, fmt)
                        output_files[f"{lang}.{fmt}"] = output

                fmt_span.set_attribute("output.file_count", len(output_files))

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "format_convert"},
                )

            # Stage 7: Quality validation
            with tracer.start_as_current_span("caption.validate") as val_span:
                stage_start = time.time()

                qa_result = validate_captions(segments, audio_info.duration)
                val_span.set_attribute("qa.timing_errors", qa_result.timing_errors)
                val_span.set_attribute("qa.overlap_errors", qa_result.overlap_errors)
                val_span.set_attribute("qa.passed", qa_result.passed)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "validate"},
                )

            # Stage 8: Upload to CDN
            with tracer.start_as_current_span("caption.deliver") as del_span:
                stage_start = time.time()

                cdn_urls = upload_captions_to_cdn(video_id, output_files)
                del_span.set_attribute("cdn.urls_count", len(cdn_urls))

                # Update the video manifest to reference the caption tracks
                update_video_manifest(video_id, cdn_urls)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "deliver"},
                )

            total_elapsed = time.time() - pipeline_start
            pipeline_duration.record(total_elapsed, common_attrs)
            caption_jobs_completed.add(1, common_attrs)
            span.set_attribute("pipeline.total_duration_s", total_elapsed)

        except Exception as e:
            span.record_exception(e)
            caption_jobs_failed.add(1, common_attrs)
            raise
```

## Key Dashboard Panels

- **Real-time factor (RTF)**: This is the most important metric for transcription performance. An RTF of 0.5 means you can transcribe an hour of audio in 30 minutes. Track p50 and p95.
- **Pipeline duration by video length**: Plot pipeline duration against video duration. You should see a roughly linear relationship. Outliers indicate processing issues.
- **ASR confidence distribution**: Low confidence scores correlate with poor caption quality. If average confidence drops, the ASR model might be seeing content it was not trained on.
- **Translation latency per language pair**: Some language pairs are faster than others. This helps set expectations and plan resources.
- **QA validation failure rate**: If timing or overlap errors are increasing, the segmentation logic might need tuning.
- **Stage breakdown**: A waterfall showing the relative cost of each stage. Transcription typically dominates, but translation can be significant with many target languages.

## Alerting

- Pipeline duration exceeding 2x the video duration (falling behind real-time)
- ASR confidence dropping below 0.7 on average
- QA validation failure rate above 5%
- Job failure rate above 2% in any 30-minute window
- Translation service latency p95 exceeding target thresholds

Monitoring the caption pipeline this way lets you maintain both speed and quality. When a content team reports that captions for a specific video are wrong or delayed, you can trace that exact job and see every decision point, from the raw ASR output through each correction and validation step.
