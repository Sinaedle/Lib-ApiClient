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
}, a = (e, t, n) => {
	let r = t.auth, i = !1, a = [], o = (e = null, t = null) => {
		a.forEach(({ resolve: n, reject: r }) => {
			e ? r(e) : n(t);
		}), a = [];
	}, s = r.shouldRefresh ?? ((e) => {
		let t = e.response?.status, n = e.response?.data?.message, i = r.refreshCondition?.statusCodes ?? [], a = r.refreshCondition?.messages ?? [];
		return t != null && i.includes(t) || n != null && a.includes(n);
	});
	e.interceptors.response.use(null, async (c) => {
		let l = c.config;
		if (c.code === "ERR_CANCELED" || !s(c) || l?._alreadyRetried || !l) return Promise.reject(c);
		if (i) return new Promise((t, n) => {
			a.push({
				resolve: (n) => {
					l.headers.Authorization = `Bearer ${n}`, t(e(l));
				},
				reject: n
			});
		});
		l._alreadyRetried = !0, i = !0;
		try {
			let i = await r.getRefreshToken();
			if (!i) throw Error("No refresh token available");
			let a = await r.refreshRequest(i, t.baseURL);
			return await r.onTokenRefreshed(a), l.headers.Authorization = `Bearer ${a.accessToken}`, o(null, a.accessToken), n("Token refreshed, retrying request"), e(l);
		} catch (e) {
			return o(e, null), n("Token refresh failed"), await r.onAuthFailure(), Promise.reject(e);
		} finally {
			i = !1;
		}
	});
}, o = (e, t, n) => {
	let { statusCodes: r, maxCount: i, backoff: a = "exponential" } = t;
	e.interceptors.response.use(null, async (t) => {
		let o = t.config, s = t.response?.status ?? 0, c = o?._retryCount ?? 0;
		if (r.includes(s) && c < i && o) {
			o._retryCount = c + 1;
			let t = a === "exponential" ? 2 ** c * 1e3 : 1e3;
			return n(`Retry ${c + 1}/${i} after ${t}ms`), await new Promise((e) => setTimeout(e, t)), e(o);
		}
		return Promise.reject(t);
	});
};
//#endregion
//#region src/utils/normalizeError.ts
function s(e) {
	return e || "";
}
function c(e, t, n) {
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
function l(e) {
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
function u(e) {
	if (!e || typeof e != "object") return null;
	let t = e;
	return typeof t.code == "string" ? t.code : typeof t.code == "number" ? String(t.code) : typeof t.errorCode == "string" ? t.errorCode : typeof t.error_code == "string" ? t.error_code : typeof t.statusCode == "number" ? String(t.statusCode) : typeof t.type == "string" ? t.type : null;
}
function d(e) {
	let t = e.config;
	if (!t) return null;
	let n = c(t.baseURL, t.url);
	return {
		url: t.url ?? "",
		method: (t.method ?? "").toUpperCase(),
		headers: p(t.headers),
		params: t.params ?? null,
		data: t.data ?? null,
		timeout: t.timeout ?? null,
		baseURL: t.baseURL ?? "",
		fullURL: n
	};
}
function f(e) {
	let t = e.response;
	return t ? {
		status: t.status,
		statusText: t.statusText ?? "",
		headers: p(t.headers),
		data: t.data ?? null
	} : null;
}
function p(e) {
	if (!e || typeof e != "object") return {};
	if (typeof e.toJSON == "function") {
		let t = e.toJSON();
		return Object.fromEntries(Object.entries(t).map(([e, t]) => [e, String(t)]));
	}
	return Object.fromEntries(Object.entries(e).map(([e, t]) => [e, String(t)]));
}
var m = (t) => {
	let n = (/* @__PURE__ */ new Date()).toISOString();
	if (e.isAxiosError(t)) {
		let e = t.response?.status ?? null, r = t.response?.data;
		return {
			status: e,
			statusText: t.response?.statusText ?? "",
			message: s(l(r)),
			code: u(r) ?? t.code ?? null,
			url: t.config?.url ?? "",
			fullURL: d(t)?.fullURL ?? "",
			method: (t.config?.method ?? "").toUpperCase(),
			request: d(t),
			response: f(t),
			duration: t.config?._requestStartTime ? Date.now() - t.config._requestStartTime : null,
			timestamp: n,
			originalError: t
		};
	}
	return t instanceof Error ? {
		status: null,
		statusText: "",
		message: t instanceof SyntaxError || t.message.includes("JSON") ? "서버 응답을 처리할 수 없습니다." : t.message,
		code: t.name,
		url: "",
		fullURL: "",
		method: "",
		request: null,
		response: null,
		duration: null,
		timestamp: n,
		originalError: t
	} : {
		status: null,
		statusText: "",
		message: typeof t == "string" ? t : "알 수 없는 오류가 발생했습니다.",
		code: null,
		url: "",
		fullURL: "",
		method: "",
		request: null,
		response: null,
		duration: null,
		timestamp: n,
		originalError: t
	};
}, h = (e) => typeof e == "object" && !!e && "timestamp" in e && "originalError" in e && "status" in e && "message" in e, g = (e, t, n) => {
	e.interceptors.response.use(null, async (e) => {
		let r = m(e), i = {
			url: r.url || void 0,
			method: r.method || void 0,
			status: r.status ?? void 0,
			duration: r.duration,
			retryCount: e && typeof e == "object" && "config" in e ? e.config?._retryCount ?? 0 : 0,
			clientType: n
		};
		return t.onError && await t.onError(r, i), Promise.reject(r);
	});
}, _ = (e) => {
	e.interceptors.request.use((e) => {
		let t = e.data;
		return t instanceof FormData || t instanceof Blob ? e.headers.delete("Content-Type") : t instanceof URLSearchParams && e.headers.set("Content-Type", "application/x-www-form-urlencoded"), e;
	});
}, v = (e) => {
	let s = t(e.debug), c = y(e);
	n(c, s), _(c), r(c, s), e.retry && o(c, e.retry, s), g(c, e, "public");
	let l = null;
	return e.auth && (l = y(e), n(l, s), _(l), i(l, e.auth), r(l, s), a(l, e, s), e.retry && o(l, e.retry, s), g(l, e, "private")), {
		publicClient: c,
		privateClient: l
	};
}, y = (t) => e.create({
	baseURL: t.baseURL,
	timeout: t.timeout ?? 0,
	withCredentials: t.withCredentials ?? !1,
	headers: {
		"Content-Type": "application/json",
		...t.defaultHeaders
	}
});
//#endregion
export { v as createApiClient, h as isHttpError, m as normalizeError };
