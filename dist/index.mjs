import e from "axios";
//#region src/utils/resolveLogger.ts
var t = (e) => e ? typeof e == "function" ? e : (e, t) => {
	t ? console.log(e, t) : console.log(e);
} : () => {}, n = (e, t) => {
	e.interceptors.request.use((e) => (e._requestStartTime = Date.now(), t(`${e.method?.toUpperCase()} ${e.url}`), e));
}, r = (e, t) => {
	e.interceptors.response.use((e) => {
		if (e.config._requestStartTime) {
			let n = Date.now() - e.config._requestStartTime;
			t(`${e.config.method?.toUpperCase()} ${e.config.url} (${n}ms)`);
		}
		return e;
	});
}, i = (e, t) => {
	e.interceptors.request.use(async (e) => {
		let n = await t.getAccessToken();
		return n && (e.headers.Authorization = `Bearer ${n}`), e;
	});
}, a = "ERR_CANCELED", o = (t) => e.isCancel(t) ? !0 : typeof t == "object" && !!t && t.code === "ERR_CANCELED";
//#endregion
//#region src/utils/serverErrorFields.ts
function s(e) {
	if (!e || typeof e != "object") return;
	let t = e;
	if (typeof t.message == "string") return t.message;
	if (Array.isArray(t.message) && t.message.length > 0) return t.message.filter((e) => typeof e == "string").join(", ");
	if (typeof t.detail == "string") return t.detail;
	if (typeof t.title == "string") return t.title;
	if (Array.isArray(t.detail) && t.detail.length > 0) return t.detail.map((e) => typeof e == "string" ? e : typeof e?.msg == "string" ? e.msg : null).filter(Boolean).join(", ");
	if (typeof t.error == "string") return t.error;
	if (typeof t.msg == "string") return t.msg;
	if (t.error && typeof t.error == "object") {
		let e = t.error;
		if (typeof e.message == "string") return e.message;
	}
}
function c(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	return typeof t.code == "string" ? t.code : typeof t.code == "number" ? String(t.code) : typeof t.errorCode == "string" ? t.errorCode : typeof t.error_code == "string" ? t.error_code : typeof t.statusCode == "number" ? String(t.statusCode) : typeof t.type == "string" ? t.type : null;
}
function l(e, t) {
	return t?.extractErrorCode?.(e) ?? c(e);
}
function u(e, t) {
	return t?.extractErrorMessage?.(e) ?? s(e);
}
//#endregion
//#region src/utils/normalizeError.ts
function d(e) {
	return e || "";
}
function f(e, t, n) {
	try {
		let r = new URL(t ?? "", e);
		if (n) {
			let e = new URLSearchParams();
			Object.entries(n).forEach(([t, n]) => {
				n != null && (Array.isArray(n) ? n.forEach((n) => e.append(t, String(n))) : e.append(t, String(n)));
			}), r.search = e.toString();
		}
		return r.toString();
	} catch {
		return t ?? "";
	}
}
function p(e) {
	let t = e.config;
	if (!t) return null;
	let n = f(t.baseURL, t.url);
	return {
		url: t.url ?? "",
		method: (t.method ?? "").toUpperCase(),
		headers: h(t.headers),
		params: t.params ?? null,
		data: t.data ?? null,
		timeout: t.timeout ?? null,
		baseURL: t.baseURL ?? "",
		fullURL: n
	};
}
function m(e) {
	let t = e.response;
	return t ? {
		status: t.status,
		statusText: t.statusText ?? "",
		headers: h(t.headers),
		data: t.data ?? null
	} : null;
}
function h(e) {
	if (!e || typeof e != "object") return {};
	if (typeof e.toJSON == "function") {
		let t = e.toJSON();
		return Object.fromEntries(Object.entries(t).map(([e, t]) => [e, String(t)]));
	}
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, String(t)]));
}
var g = (t, n) => {
	let r = (/* @__PURE__ */ new Date()).toISOString();
	if (e.isAxiosError(t)) {
		let e = t.response?.status ?? null, i = t.response?.data;
		return {
			status: e,
			statusText: t.response?.statusText ?? "",
			message: d(u(i, n)),
			code: l(i, n) ?? t.code ?? null,
			isCanceled: o(t),
			url: t.config?.url ?? "",
			fullURL: p(t)?.fullURL ?? "",
			method: (t.config?.method ?? "").toUpperCase(),
			request: p(t),
			response: m(t),
			duration: t.config?._requestStartTime ? Date.now() - t.config._requestStartTime : null,
			timestamp: r,
			originalError: t
		};
	}
	return t instanceof Error ? {
		status: null,
		statusText: "",
		message: t instanceof SyntaxError || t.message.includes("JSON") ? "서버 응답을 처리할 수 없습니다." : t.message,
		code: t.name,
		isCanceled: o(t),
		url: "",
		fullURL: "",
		method: "",
		request: null,
		response: null,
		duration: null,
		timestamp: r,
		originalError: t
	} : {
		status: null,
		statusText: "",
		message: typeof t == "string" ? t : "알 수 없는 오류가 발생했습니다.",
		code: null,
		isCanceled: !1,
		url: "",
		fullURL: "",
		method: "",
		request: null,
		response: null,
		duration: null,
		timestamp: r,
		originalError: t
	};
}, _ = (e) => typeof e == "object" && !!e && "timestamp" in e && "originalError" in e && "status" in e && "message" in e, v = (e, t, n) => {
	let r = t.auth, i = !1, a = [], s = (e = null, t = null) => {
		a.forEach(({ resolve: n, reject: r }) => {
			e ? r(e) : n(t);
		}), a = [];
	}, c = r.shouldRefresh ?? ((e, n) => {
		let i = r.refreshCondition, a = n.code;
		if (a != null && (i?.excludeCodes ?? []).includes(a)) return !1;
		let o = e.response?.status, s = u(e.response?.data, t.errorFields);
		return o != null && (i?.statusCodes ?? []).includes(o) || s != null && (i?.messages ?? []).includes(s) || a != null && (i?.codes ?? []).includes(a);
	});
	e.interceptors.response.use(null, async (l) => {
		let u = l.config;
		if (o(l) || !c(l, g(l, t.errorFields)) || u?._alreadyRetried || !u) return Promise.reject(l);
		if (i) return new Promise((t, n) => {
			a.push({
				resolve: (n) => {
					u.headers.Authorization = `Bearer ${n}`, t(e(u));
				},
				reject: n
			});
		});
		u._alreadyRetried = !0, i = !0;
		try {
			let i = await r.getRefreshToken();
			if (!i) throw Error("No refresh token available");
			let a = await r.refreshRequest(i, t.baseURL);
			return await r.onTokenRefreshed(a), u.headers.Authorization = `Bearer ${a.accessToken}`, s(null, a.accessToken), n("Token refreshed, retrying request"), e(u);
		} catch (e) {
			return s(e, null), n("Token refresh failed"), await r.onAuthFailure(), Promise.reject(e);
		} finally {
			i = !1;
		}
	});
}, y = (e, t, n) => {
	let { statusCodes: r, maxCount: i, backoff: a = "exponential" } = t;
	e.interceptors.response.use(null, async (t) => {
		let s = t.config, c = t.response?.status ?? 0, l = s?._retryCount ?? 0;
		if (o(t)) return Promise.reject(t);
		if (r.includes(c) && l < i && s) {
			s._retryCount = l + 1;
			let t = a === "exponential" ? 2 ** l * 1e3 : 1e3;
			return n(`Retry ${l + 1}/${i} after ${t}ms`), await new Promise((e) => setTimeout(e, t)), e(s);
		}
		return Promise.reject(t);
	});
}, b = (e, t, n) => {
	e.interceptors.response.use(null, async (e) => {
		let r = g(e, t.errorFields);
		if (r.isCanceled) return Promise.reject(r);
		let i = {
			url: r.url || void 0,
			method: r.method || void 0,
			status: r.status ?? void 0,
			duration: r.duration,
			retryCount: e && typeof e == "object" && "config" in e ? e.config?._retryCount ?? 0 : 0,
			clientType: n
		};
		return t.onError && await t.onError(r, i), Promise.reject(r);
	});
}, x = (e) => {
	e.interceptors.request.use((e) => {
		let t = e.data;
		return t instanceof FormData || t instanceof Blob ? e.headers.delete("Content-Type") : t instanceof URLSearchParams && e.headers.set("Content-Type", "application/x-www-form-urlencoded"), e;
	});
}, S = (e) => {
	let a = t(e.debug), o = C(e);
	n(o, a), x(o), r(o, a), e.retry && y(o, e.retry, a), b(o, e, "public");
	let s = null;
	return e.auth && (s = C(e), n(s, a), x(s), i(s, e.auth), r(s, a), v(s, e, a), e.retry && y(s, e.retry, a), b(s, e, "private")), {
		publicClient: o,
		privateClient: s
	};
}, C = (t) => e.create({
	baseURL: t.baseURL,
	timeout: t.timeout ?? 0,
	withCredentials: t.withCredentials ?? !1,
	headers: {
		"Content-Type": "application/json",
		...t.defaultHeaders
	}
});
//#endregion
export { a as CANCELED_ERROR_CODE, S as createApiClient, c as extractServerCode, s as extractServerMessage, o as isCanceledError, _ as isHttpError, g as normalizeError };
