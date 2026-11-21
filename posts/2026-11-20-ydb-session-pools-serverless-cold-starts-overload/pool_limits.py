"""YDB SDK 3.35.0: create once per worker using a ready caller-owned driver."""
from contextlib import contextmanager
from threading import BoundedSemaphore
import ydb


class AdmissionBusy(Exception):
    """Caller must apply backpressure rather than create another pool."""


class ReadGateway:
    def __init__(self, driver, capacity=8):
        if not isinstance(capacity, int) or isinstance(capacity, bool) or capacity < 1:
            raise ValueError("capacity must be a positive integer")
        self.pool = ydb.QuerySessionPool(driver, size=capacity)
        self._slots = BoundedSemaphore(capacity)

    @contextmanager
    def admitted(self, timeout=0.05):
        if not self._slots.acquire(timeout=timeout):
            raise AdmissionBusy("Database admission capacity is busy")
        try:
            yield
        finally:
            self._slots.release()

    def probe(self):
        # SELECT 1 is a connectivity probe, not a business-query benchmark.
        with self.admitted():
            return self.pool.execute_with_retries(
                "SELECT 1 AS one;",
                retry_settings=ydb.RetrySettings(
                    max_retries=2,
                    max_session_acquire_timeout=0.5,
                    idempotent=True,
                ),
                settings=ydb.BaseRequestSettings().with_timeout(2),
            )

    def close(self):
        # Call only after the host has stopped new work and drained active calls.
        self.pool.stop()
