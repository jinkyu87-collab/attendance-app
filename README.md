# 매장 근무 관리 시스템

React + Vite + Firebase(Firestore) 기반 매장 출퇴근/매출/입고/공지/안전 관리 앱.

## 로컬 개발

```bash
npm install
cp .env.example .env   # 아래 Firebase 설정값 채우기
npm run dev
```

## Firebase 프로젝트 설정

1. https://console.firebase.google.com 에서 새 프로젝트 생성
2. **Build > Firestore Database** 에서 데이터베이스 생성 (프로덕션 모드)
3. **Build > Authentication > Sign-in method** 에서 **익명(Anonymous)** 로그인 제공업체 활성화
   (이 앱은 별도 로그인 화면 없이 PIN으로 동작하므로, 익명 인증으로 Firestore 접근 권한만 확보합니다)
4. Firestore **규칙(Rules)** 을 아래처럼 설정 (로그인된 클라이언트만 읽기/쓰기 허용):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /appData/{docId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

5. **프로젝트 설정 > 일반 > 내 앱**에서 웹 앱 추가 후 `firebaseConfig` 값을 복사
6. 로컬 개발용: `.env` 파일에 `VITE_FIREBASE_*` 값 채우기
7. 배포용: 아래 "배포" 항목대로 GitHub Secrets에 동일한 값 등록

## 배포 (GitHub Pages)

`main` 브랜치에 push하면 `.github/workflows/deploy.yml` 이 자동으로 빌드 후 GitHub Pages에 배포합니다.

사전 준비:
- 저장소 **Settings > Pages > Build and deployment > Source** 를 **GitHub Actions** 로 설정
- 저장소 **Settings > Secrets and variables > Actions** 에 다음 시크릿 등록:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

> 저장소가 Private이어도 GitHub Pages로 배포된 사이트 URL 자체는 누구나 접근 가능합니다(Enterprise 플랜의 접근 제어 기능 제외). 민감한 정보는 Firestore 보안 규칙(위 4번)으로 보호하세요.

## 데이터 저장 구조

기존 `window.storage` 키-값 저장 방식을 그대로 유지한 채, Firestore 컬렉션 `appData`의 문서 ID로 매핑했습니다 (예: `attendance:st1:2026-07-09`). 각 문서는 `{ value: "<JSON 문자열>" }` 형태로 저장됩니다.
