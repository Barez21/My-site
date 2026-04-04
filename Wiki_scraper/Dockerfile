FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY wiki_gui.py .
COPY wiki_scraper.py .
RUN mkdir -p wiki_output wiki_logs
EXPOSE 7842
CMD ["gunicorn", "-w", "1", "--threads", "8", "--timeout", "120", "-b", "0.0.0.0:7842", "wiki_gui:app"]