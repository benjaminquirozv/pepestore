FROM python:3.12-slim

# Evitar output buffer
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Railway usa esta variable para el puerto interno
ENV PORT=8000

EXPOSE 8000

# Ejecutar tu aplicación
CMD ["python", "back/pepestore.py"]
