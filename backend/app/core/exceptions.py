class MolecularAIError(Exception):
    """Application-level exception surfaced as a friendly API error."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

