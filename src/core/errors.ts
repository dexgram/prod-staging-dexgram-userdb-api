export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorResponse = (error: ApiError, requestId: string): Response =>
  Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status: error.status },
  );
