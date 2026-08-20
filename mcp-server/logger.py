import time
import json
from db import get_db

def log_operation(request_id: str, tool_name: str, input_params: dict,
                  result_summary: dict, is_success: bool, duration_ms: int):
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO operation_logs
                        (request_id, tool_name, input_params, result_summary, is_success, duration_ms)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    request_id,
                    tool_name,
                    json.dumps(input_params, ensure_ascii=False),
                    json.dumps(result_summary, ensure_ascii=False),
                    is_success,
                    duration_ms,
                ))
    except Exception as e:
        print(f"[logger] failed to write log: {e}")


class Timer:
    def __init__(self):
        self._start = time.time()

    def elapsed_ms(self) -> int:
        return int((time.time() - self._start) * 1000)
