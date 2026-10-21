using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace ProCricket3D.Backend
{
    [Serializable]
    public class PlayerProfileData
    {
        public string id;
        public string gamer_tag;
        public int level;
        public int experience_points;
        public long coins;
        public int gems;
        public int trophies;
    }

    /// <summary>
    /// Lightweight, high-performance Supabase REST integration for cloud saves,
    /// currency transactions, and global leaderboards.
    /// </summary>
    public class SupabaseGameManager : MonoBehaviour
    {
        public static SupabaseGameManager Instance { get; private set; }

        [Header("Supabase Configuration")]
        [SerializeField] private string supabaseUrl = "https://your-project.supabase.co";
        [SerializeField] private string supabaseAnonKey = "your-anon-key";

        [Header("Current Active Player")]
        public PlayerProfileData CurrentProfile;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>
        /// Fetch cloud player profile from Supabase.
        /// </summary>
        public void FetchProfile(string userId, Action<PlayerProfileData> onSuccess, Action<string> onError)
        {
            StartCoroutine(GetProfileCoroutine(userId, onSuccess, onError));
        }

        private IEnumerator GetProfileCoroutine(string userId, Action<PlayerProfileData> onSuccess, Action<string> onError)
        {
            string url = $"{supabaseUrl}/rest/v1/profiles?id=eq.{userId}&select=*";

            using (UnityWebRequest request = UnityWebRequest.Get(url))
            {
                request.SetRequestHeader("apikey", supabaseAnonKey);
                request.SetRequestHeader("Authorization", $"Bearer {supabaseAnonKey}");
                request.SetRequestHeader("Accept", "application/json");

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    string json = request.downloadHandler.text;
                    // Parse array wrapper
                    if (json.StartsWith("[") && json.EndsWith("]"))
                    {
                        json = json.Substring(1, json.Length - 2);
                    }

                    if (!string.IsNullOrEmpty(json))
                    {
                        PlayerProfileData profile = JsonUtility.FromJson<PlayerProfileData>(json);
                        CurrentProfile = profile;
                        onSuccess?.Invoke(profile);
                    }
                    else
                    {
                        onError?.Invoke("Profile not found");
                    }
                }
                else
                {
                    onError?.Invoke(request.error);
                }
            }
        }

        /// <summary>
        /// Update coins and trophies after a match concludes.
        /// </summary>
        public void SyncMatchRewards(int coinsEarned, int trophiesEarned, Action onComplete)
        {
            if (CurrentProfile == null) return;

            CurrentProfile.coins += coinsEarned;
            CurrentProfile.trophies += trophiesEarned;

            string payload = $"{{\"coins\": {CurrentProfile.coins}, \"trophies\": {CurrentProfile.trophies}}}";
            StartCoroutine(PatchProfileCoroutine(CurrentProfile.id, payload, onComplete));
        }

        private IEnumerator PatchProfileCoroutine(string userId, string jsonBody, Action onComplete)
        {
            string url = $"{supabaseUrl}/rest/v1/profiles?id=eq.{userId}";

            using (UnityWebRequest request = new UnityWebRequest(url, "PATCH"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("apikey", supabaseAnonKey);
                request.SetRequestHeader("Authorization", $"Bearer {supabaseAnonKey}");

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log("[SUPABASE] Profile rewards synchronized successfully.");
                    onComplete?.Invoke();
                }
                else
                {
                    Debug.LogError($"[SUPABASE] Failed to sync profile: {request.error}");
                }
            }
        }
    }
}
