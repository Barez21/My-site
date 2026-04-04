FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY wiki_gui.py .
COPY wiki_scraper.py .

RUN mkdir -p wiki_output

EXPOSE 7842

CMD ["python", "wiki_gui.py"]
