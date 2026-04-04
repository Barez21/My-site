FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY wiki_gui.py .
COPY wiki_scraper.py .
COPY openapi.yaml .
RUN mkdir -p wiki_output wiki_logs
EXPOSE 7842
ENV SCRIPT_NAME=/wiki_scraper
CMD ["gunicorn", "-w", "1", "--threads", "8", "--timeout", "120", "-b", "0.0.0.0:7842", "--forwarded-allow-ips=*", "wiki_gui:app"]