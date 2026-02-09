# How to Trace Online Exam Proctoring System Workflows (Identity Verification, Session Monitoring) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Proctoring, EdTech, Distributed Tracing

Description: Trace identity verification and session monitoring workflows in online exam proctoring systems using OpenTelemetry.

Online exam proctoring has become critical for educational institutions. These systems involve multiple complex workflows running simultaneously: identity verification through facial recognition, browser lockdown enforcement, live session monitoring, and flagging suspicious behavior. When any of these fail during an active exam, the consequences are serious. This post covers how to instrument proctoring system workflows with OpenTelemetry so you can trace every step from student login to exam submission.

## Architecture of a Proctoring System

A typical proctoring system has several services that need to work together in real time:

1. Identity verification service (facial recognition, ID matching)
2. Session manager (tracks active exam sessions)
3. Media capture service (webcam, screen recording)
4. Behavior analysis engine (detects suspicious activity)
5. Alert dispatcher (notifies proctors of flagged events)

Each service is a potential point of failure during a live exam. OpenTelemetry lets you trace a student's entire exam session across all of these services.

## Instrumenting the Identity Verification Flow

The identity verification step happens before the exam starts and usually involves comparing a live webcam capture against a stored photo ID. Here is how to instrument it:

```python
from opentelemetry import trace
from opentelemetry.trace import SpanKind, StatusCode

tracer = trace.get_tracer("proctoring.identity")

def verify_student_identity(student_id, exam_id, webcam_frame, stored_photo):
    with tracer.start_as_current_span(
        "identity.verification",
        kind=SpanKind.SERVER,
        attributes={
            "proctor.student_id": student_id,
            "proctor.exam_id": exam_id,
            "proctor.verification_type": "facial_recognition",
        }
    ) as span:
        # Step 1: Detect face in webcam frame
        with tracer.start_as_current_span("identity.face_detection") as face_span:
            face_result = detect_face(webcam_frame)
            face_span.set_attribute("proctor.face_detected", face_result.found)
            face_span.set_attribute("proctor.face_confidence", face_result.confidence)

            if not face_result.found:
                span.set_status(StatusCode.ERROR, "No face detected in webcam frame")
                return {"verified": False, "reason": "no_face_detected"}

        # Step 2: Compare against stored photo
        with tracer.start_as_current_span("identity.face_comparison") as compare_span:
            match_result = compare_faces(face_result.embedding, stored_photo)
            compare_span.set_attribute("proctor.match_score", match_result.score)
            compare_span.set_attribute("proctor.match_threshold", 0.85)
            compare_span.set_attribute("proctor.match_passed", match_result.score >= 0.85)

        # Step 3: Run liveness detection to prevent photo spoofing
        with tracer.start_as_current_span("identity.liveness_check") as liveness_span:
            liveness = check_liveness(webcam_frame)
            liveness_span.set_attribute("proctor.liveness_score", liveness.score)
            liveness_span.set_attribute("proctor.liveness_passed", liveness.is_live)

        verified = match_result.score >= 0.85 and liveness.is_live
        span.set_attribute("proctor.identity_verified", verified)

        return {"verified": verified, "match_score": match_result.score}
```

## Tracing Session Monitoring

Once the student is verified, the session monitoring begins. This involves continuous checks throughout the exam:

```python
tracer_session = trace.get_tracer("proctoring.session")

class ExamSessionMonitor:
    def __init__(self, student_id, exam_id):
        self.student_id = student_id
        self.exam_id = exam_id

    def process_monitoring_frame(self, frame_data):
        """Called every few seconds during the exam to analyze student behavior."""
        with tracer_session.start_as_current_span(
            "session.process_frame",
            attributes={
                "proctor.student_id": self.student_id,
                "proctor.exam_id": self.exam_id,
                "proctor.frame_timestamp": frame_data.timestamp,
            }
        ) as span:
            # Check if the student is still present
            presence = self.check_presence(frame_data)
            span.set_attribute("proctor.student_present", presence.detected)

            # Check for additional people in the frame
            people_count = self.count_people(frame_data)
            span.set_attribute("proctor.people_count", people_count)

            # Analyze eye gaze direction
            gaze = self.analyze_gaze(frame_data)
            span.set_attribute("proctor.gaze_direction", gaze.direction)
            span.set_attribute("proctor.gaze_off_screen", gaze.is_off_screen)

            # Check for prohibited objects (phones, notes)
            objects = self.detect_objects(frame_data)
            span.set_attribute("proctor.prohibited_objects", str(objects.detected_items))

            # Flag suspicious behavior
            flags = []
            if not presence.detected:
                flags.append("student_absent")
            if people_count > 1:
                flags.append("multiple_people")
            if gaze.is_off_screen:
                flags.append("looking_away")
            if objects.detected_items:
                flags.append("prohibited_object")

            span.set_attribute("proctor.flags", str(flags))
            span.set_attribute("proctor.flag_count", len(flags))

            if flags:
                self.dispatch_alert(flags)

            return flags
```

## Tracking Browser Lockdown Events

The browser lockdown component prevents students from navigating away from the exam. Instrument these events to understand when and why lockdown failures occur:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('proctoring.lockdown');

// Track browser focus changes
function onBrowserFocusChange(examSession, hasFocus) {
  const span = tracer.startSpan('lockdown.focus_change', {
    attributes: {
      'proctor.exam_id': examSession.examId,
      'proctor.student_id': examSession.studentId,
      'proctor.browser_has_focus': hasFocus,
      'proctor.timestamp': Date.now(),
    },
  });

  if (!hasFocus) {
    // Student navigated away from the exam window
    span.addEvent('lockdown_violation', {
      'proctor.violation_type': 'focus_lost',
      'proctor.exam_elapsed_seconds': examSession.getElapsedSeconds(),
    });

    examSession.incrementViolationCount();
    span.setAttribute('proctor.total_violations', examSession.violationCount);
  }

  span.end();
}

// Track copy-paste attempts
function onClipboardAccess(examSession, action) {
  const span = tracer.startSpan('lockdown.clipboard_access', {
    attributes: {
      'proctor.exam_id': examSession.examId,
      'proctor.clipboard_action': action, // 'copy' or 'paste'
      'proctor.violation_type': 'clipboard_access',
    },
  });

  span.addEvent('lockdown_violation', {
    'proctor.violation_type': `clipboard_${action}`,
  });

  span.end();
}
```

## Building a Monitoring Dashboard

With all this telemetry flowing, you can build dashboards that show proctors and administrators the health of the system in real time. Key metrics to track:

- Identity verification success rate (should be above 95%)
- Average verification latency (target under 5 seconds)
- Active session count vs system capacity
- Flag rate per exam (helps identify problematic exam sessions)
- Browser lockdown violation frequency

## Handling Exam-Day Scale

Exam days can see a 10x spike in concurrent sessions. Use OpenTelemetry metrics to track resource utilization and set up alerts:

```python
from opentelemetry import metrics

meter = metrics.get_meter("proctoring.capacity")

active_sessions = meter.create_up_down_counter(
    "proctor.active_sessions",
    description="Number of currently active proctoring sessions",
)

verification_latency = meter.create_histogram(
    "proctor.verification_latency_ms",
    description="Time taken to complete identity verification",
    unit="ms",
)
```

## Conclusion

Tracing proctoring workflows with OpenTelemetry gives you end-to-end visibility into one of the most critical systems in online education. By instrumenting identity verification, session monitoring, and browser lockdown events, you can ensure exams run smoothly and respond quickly when something goes wrong.
