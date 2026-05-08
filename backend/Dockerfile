# Use a lightweight version of Python to keep the container small
FROM python:3.9-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first to cache the installations
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code (server.py and the database folder)
COPY . .

# Expose port 5000 to match Flask
EXPOSE 5000

# Command to start the Flask server
CMD ["python", "server.py"]