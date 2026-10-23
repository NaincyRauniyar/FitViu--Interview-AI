# ── Build stage ───────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# ── Run stage ─────────────────────────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# Render/HF set PORT; fall back to 8080 locally
CMD ["sh", "-c", "java -XX:MaxRAMPercentage=75 -Dserver.port=${PORT:-8080} -jar app.jar"]
