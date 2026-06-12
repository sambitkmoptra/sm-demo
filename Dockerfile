FROM python:3.12-slim

# Force stdin, stdout, and stderr to be unbuffered to avoid lost logs in container runtimes
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system utilities needed for building some python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies first to cache docker layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the remaining project files
COPY . .

# Set default server port environment variable
ENV PORT=8080
EXPOSE 8080

# Run FastAPI serving service
CMD ["python", "main.py"]
