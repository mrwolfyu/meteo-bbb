const config = require('../.config.json');
const crypto = require('crypto');
const request = require('request');
const parser = require('xml2json');
const xform = require('x-www-form-urlencode');

urlbuilder = exports.urlbuilder = (action, params) => {
    var shasum = crypto.createHash('sha1');
    var ret = "http://" + config.BBB_IP  + config.BBB_URL + "/api/";
    var check =  action + params + config.BBB_SECRET ;
    shasum.update(check);
    if(params == '') {return ret + action + '?' + 'checksum='+shasum.digest('hex'); }
    return ret + action + '?' + params + '&checksum='+shasum.digest('hex');
};

bbbcreate = exports.bbbcreate = (req, res, room , next) => {
        var roompw=room.attendeePW;
        // DAJ SAMO ADMINU I MODERATORU
        //if( req.user.profile.tip  === 'moderator' || req.user.profile.tip  === 'admin' ) {roompw=room.moderatorPW;}
        // DAJ SVIMA
        if( req.user.profile.tip  === 'moderator' || req.user.profile.tip  === 'admin' || req.user.profile.tip  === 'attendee' ) {roompw=room.moderatorPW;}
                //CREATE
                params='meetingID='+ xform.encode(room.meetingID)
                      +'&name='+ xform.encode(room.fullName)
                      +'&moderatorPW='+ xform.encode(room.moderatorPW)
                      +'&attendeePW='+ xform.encode(room.attendeePW)
                      +'&welcome=' + xform.encode(room.welcome)
                      +'&meta_currentDate=' + xform.encode(Date().toString())
                      +'&meta_org=SMATSA'
                      +'&meta_roomID=' + xform.encode(room._id)
                      +'&meta_roomfullName=' + xform.encode(room.fullName)
                      +'&meta_author=' + xform.encode(room.author)
                      +"&allowStartStopRecording=false&autoStartRecording=true&record=true";
            
                url = urlbuilder('create',params);
                request({url: url, method: 'POST'}, function (error, response, body) {
                    if ((error && response.statusCode == 200 ) || JSON.parse(parser.toJson(body)).response.returncode != 'FAILED') {
                        return next('');
                            }
                    else {
                        return next(error);
                    }

                    });
};

exports.bbbjoin = (req, room, next) => {
    bbbgetMeetingsById(room.meetingID, (err, meetings) => {
        if(err) { return next(err);}
        else {
            var roompw=room.attendeePW;
            if( req.user.profile.tip  === 'moderator' || req.user.profile.tip  === 'admin' ) {
                roompw=room.moderatorPW;
            }
            if( req.user.profile.xml != '' ) {
                var url = urlbuilder('setConfigXML', 'configXML='+ xform.encode(req.user.profile.xml)+'&meetingID=' + xform.encode(room.meetingID));

                request({url: url, method:'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'} } , (error, response, body) => {
                    if(error) return next(error);
                    var token = JSON.parse(parser.toJson(body)).response.configToken;
                    url = urlbuilder('join','meetingID='+xform.encode(room.meetingID)+'&password='+ roompw
                                        + '&configToken=' + token +'&fullName='+xform.encode(req.user.profile.name)+'&redirect=true');
                    return next('', url);
                });

            } else {
                url = urlbuilder('join','meetingID='+xform.encode(room.meetingID)
                                    +'&password='+  roompw + '&fullName=' + xform.encode(req.user.profile.name) +'&redirect=true');
                return next('', url);
            }
        }
    });
};

bbbgetDefaultConfigXML = exports.bbbgetDefaultConfigXML= ( next) => {
    var meetings = [];
    var url = urlbuilder('getDefaultConfigXML','');
    request({url: url, method: 'POST'}, function (error, response, body) {
        if (!error && response.statusCode == 200 ) {
            return next('',body);

        } else {
            return next(error);    
        }
      });
};

bbbgetMeetingsById = exports.bbbgetMeetingsById = ( id, next) => {
    var meetings = [];
    var url = urlbuilder('getMeetingInfo','meetingID='+xform.encode(id));
    request({url: url, method: 'POST'}, function (error, response, body) {
        if (!error && response.statusCode == 200 ) {
            var jsons = parser.toJson(body);
            meetings = (JSON.parse(jsons)).response;
            if (meetings.returncode == 'FAILED') {return next("ERROR");}
            else return next('',meetings);

        } else {
            return next(error);    
        }
      });
};

bbbgetMeetings = exports.bbbgetMeetings = (next) => {
    var meetings;
    var url = urlbuilder('getMeetings','');
    request({url: url, method: 'POST'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        if (typeof((JSON.parse(parser.toJson(body))).response.meetings.meeting) == 'undefined'){
            meetings = (JSON.parse(parser.toJson(body))).response.meetings;
            return next('', meetings);
        }
        else {
        meetings = (JSON.parse(parser.toJson(body))).response.meetings.meeting;
        var meet=[];
	    //console.log(meetings);
        if(meetings) {
            if (typeof(meetings[0]) == 'undefined'){
                meet.push(meetings);
                meetings=meet;
            }
            return next('', meetings);    
        } else {
            return next(error);
        } 
        } 
    } else {
            return next(error);
            }
    
   });
};

exports.bbbgetRecordings = (next) => {
    var recordings = [];
    var url = urlbuilder('getRecordings','');
    request({url: url, method: 'POST'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        recordings = (JSON.parse(parser.toJson(body))).response.recordings.recording;
	    var rec=[];
	    //console.log(recordings);
 	    if(recordings) {	
		    if (typeof(recordings[0]) == 'undefined'){
		    	rec.push(recordings);
		    	recordings=rec;
		    }
            return next('',recordings);
        } else {
            return next(error);
        }
	}
	return next(error);
      });
};
exports.bbbgetRecordingsById = (id, next) => {
    var recordings = [];
    var url = urlbuilder('getRecordings','recordID='+xform.encode(id));
    request({url: url, method: 'POST'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var jsons = parser.toJson(body);
        recordings = (JSON.parse(jsons)).response.recordings.recording;
        return next('',recordings);            
      } else {
            return next(error);
            }
      });
};
// exports.bbbgetRecordingsByMeeingId = (id, next) => {
//     var recordings = [];
//     var url = urlbuilder('getRecordings','meetingID='+xform.encode(id));
//     request({url: url, method: 'POST'}, function (error, response, body) {
//     if (!error && response.statusCode == 200) {
//         var jsons = parser.toJson(body);
//         recordings = (JSON.parse(jsons)).response.recordings.recording;
//         return next('',recordings);            
//       } else {
//             return next(error);
//             }
//       });
// };


exports.bbbgetRecordingsByMId = (id, next) => {
    var recordings = [];
    var url = urlbuilder('getRecordings','meetingID='+xform.encode(id));
    request({url: url, method: 'POST'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var jsons = parser.toJson(body);
        recordings = (JSON.parse(jsons)).response.recordings.recording;
        var rec=[];
          if (typeof(recordings[0]) == 'undefined'){
		    	rec.push(recordings);
		    	recordings=rec;
		    }
        return next('',recordings);            
      } else {
            return next(error);
            }
      });
};

exports.bbbend = (id, next) => {
    bbbgetMeetingsById(id, (err, meetings) => {
        if(err) { return next(err);}
        else {
            var url = urlbuilder('end','meetingID='+ xform.encode(meetings.meetingID) + "&password="+xform.encode(meetings.moderatorPW));
            request({url: url, method: 'POST'}, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    if ((JSON.parse(parser.toJson(body))).response.returncode == 'FAILED') {return next("ERROR");}
                    else return next('') ;
                } else {
                    return next(error);
                }
            });
       }
    });
};

