# 꼬순내 마켓 AI 상담 (로컬 실행)

## 실행
1. Node.js 18 이상 설치 확인: `node -v`
2. `.env` 파일을 열어 `ANTHROPIC_API_KEY=` 뒤에 API 키를 붙여 넣고 저장
3. 터미널에서 이 폴더로 이동해 실행
   ```
   npm start
   ```
4. 브라우저에서 http://localhost:3000 (관리자: http://localhost:3000/#admin)

키는 서버만 알고, 브라우저로는 전달되지 않습니다. `.env`는 `.gitignore`에 들어 있어 깃에 올라가지 않아요.

## 구조
- `server.js` : 정적 파일 + `/api/ask`(Claude 호출, 스트리밍) + `/api/health`
- `public/index.html` : 고객 채팅 + 관리자 화면 (데이터는 브라우저 localStorage에 저장)
- `.env` : API 키, 포트, 모델 이름

## 참고
- 상품·주문·FAQ·상담 기록은 브라우저(localStorage)에 저장돼요. 관리자 > AI 연결에서 샘플 데이터로 되돌릴 수 있어요.
- 모델 이름이 맞지 않아 오류가 나면 `.env`의 `MODEL_*`를 수정하세요.
- 테스트 후에는 사용한 API 키를 Anthropic 콘솔에서 삭제(폐기)하세요.
